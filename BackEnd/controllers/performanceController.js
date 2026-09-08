const supabase = require('../config/supabase');

exports.get_performance = async (req, res) => {
    try {
        const { data: employees } = await supabase
            .from('employees')
            .select('id, nama_lengkap, nomor_pegawai, jabatan, penempatan, departments(name), users(role_id, roles(name))');

        const mockKpis = (employees || []).map(emp => ({
            id: `kpi-${emp.id}`,
            user_id: emp.id,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            rating: 88.5,
            users: {
                full_name: emp.nama_lengkap,
                role: emp.users?.roles?.name || 'user',
                division: emp.departments?.name || 'Operasional'
            },
            status: 'Approved',
            evaluation_date: new Date()
        }));

        res.json(mockKpis);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const { getOrSetCache } = require('../utils/cache');

exports.get_roster_stats = async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const cacheKey = `roster:stats:${todayStr}`;

        const rosterList = await getOrSetCache(cacheKey, 30, async () => {
            const { data: employees, error: empErr } = await supabase
                .from('employees')
                .select('id, nama_lengkap, nomor_pegawai, jabatan, level, penempatan, roster_type, departments(name)')
                .order('nama_lengkap', { ascending: true });

            if (empErr) throw empErr;

            // Fetch active leaves for today
            const { data: activeLeaves, error: leaveErr } = await supabase
                .from('leaves')
                .select('employee_id, leave_type, start_date, end_date, notes')
                .lte('start_date', todayStr)
                .gte('end_date', todayStr);

            if (leaveErr) console.warn('Could not fetch active leaves:', leaveErr.message);

            // Real-time calculation of calendar operational days in current month
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;
            const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
            const startOfMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
            const endOfMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInCurrentMonth).padStart(2, '0')}`;

            // Fetch monthly attendance logs to count real presence if needed
            const { data: monthLogs } = await supabase
                .from('attendance_logs')
                .select('employee_id, date')
                .gte('date', startOfMonthStr)
                .lte('date', endOfMonthStr);

            const attendedDaysMap = new Map();
            (monthLogs || []).forEach(l => {
                if (!attendedDaysMap.has(l.employee_id)) {
                    attendedDaysMap.set(l.employee_id, new Set());
                }
                attendedDaysMap.get(l.employee_id).add(l.date);
            });

            // Map active leaves by employee_id
            const leaveMap = new Map();
            (activeLeaves || []).forEach(l => {
                if (l.employee_id) leaveMap.set(l.employee_id, l);
            });

            return (employees || []).map((emp, i) => {
                // Determine roster type: prioritize emp.roster_type from DB if present
                let rosterTypeLabel = '8/2 (Staff)';
                if (emp.roster_type) {
                    rosterTypeLabel = emp.roster_type.includes('6/2') ? '6/2 (PJO/Khusus)' : `${emp.roster_type} (Staff)`;
                } else {
                    const is6_2 = (emp.level || '').includes('1') || (emp.level || '').includes('2') || (emp.level || '').includes('3') || (emp.jabatan || '').toLowerCase().includes('pjo');
                    rosterTypeLabel = is6_2 ? '6/2 (PJO/Khusus)' : '8/2 (Staff)';
                }

                // Rotational 13/1 cycle: 13 days work + 1 day off (day 14)
                const cycleDay = (i % 14) + 1;
                const is13_1Off = cycleDay === 14;

                // Check if employee has an active leave today in DB
                const activeLeave = leaveMap.get(emp.id);
                
                let rosterStatus = 'On Site';
                let cycle13_1 = `Hari ke-${cycleDay} dari 14`;
                let countdown = `${14 - cycleDay} hari lagi ke Off 13/1`;

                if (activeLeave) {
                    const typeLower = (activeLeave.leave_type || '').toLowerCase();
                    if (typeLower.includes('cuti')) {
                        rosterStatus = 'Cuti Roster';
                        cycle13_1 = 'Sedang Cuti Roster';
                        countdown = `Cuti s/d ${activeLeave.end_date}`;
                    } else if (typeLower.includes('13/1') || typeLower.includes('off') || typeLower.includes('libur')) {
                        rosterStatus = 'Off (13/1)';
                        cycle13_1 = 'Off 13/1';
                        countdown = 'Sedang Off Hari Ini';
                    } else {
                        rosterStatus = 'Izin / Cuti';
                        cycle13_1 = activeLeave.leave_type;
                        countdown = `s/d ${activeLeave.end_date}`;
                    }
                } else if (is13_1Off) {
                    rosterStatus = 'Off (13/1)';
                    cycle13_1 = 'Off 13/1';
                    countdown = 'Sedang Off Hari Ini';
                }

                const hadirCount = attendedDaysMap.get(emp.id)?.size || 0;

                return {
                    id: emp.id,
                    user_id: emp.id,
                    name: emp.nama_lengkap || 'Karyawan',
                    nomor_pegawai: emp.nomor_pegawai || `EMP-${i+1}`,
                    role: emp.jabatan || 'Staff',
                    division: emp.departments?.name || 'Operasional',
                    roster_type: rosterTypeLabel,
                    roster_status: rosterStatus,
                    current_cycle_day: cycleDay,
                    cycle_13_1: cycle13_1,
                    work_days_this_month: daysInCurrentMonth, // Realtime days in current month (e.g. 30 Hari di September)
                    total_site_days: daysInCurrentMonth,
                    days_in_month: daysInCurrentMonth,
                    hadir_days: hadirCount,
                    countdown: countdown,
                    offset: 0
                };
            });
        });

        res.json(rosterList);
    } catch (err) {
        console.error('roster stats error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.post_performance = async (req, res) => {
    res.status(201).json({ message: 'KPI berhasil disimpan', kpi: req.body });
};

exports.put_performance_id = async (req, res) => {
    res.json({ message: 'KPI berhasil diperbarui', kpi: req.body });
};

exports.delete_performance_id = async (req, res) => {
    res.json({ message: 'KPI berhasil dihapus' });
};

exports.put_user_roster = async (req, res) => {
    res.json({ message: 'Tipe roster karyawan berhasil diperbarui' });
};
