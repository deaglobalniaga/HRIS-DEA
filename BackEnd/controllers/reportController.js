const supabase = require('../config/supabase');
const { getOrSetCache, invalidateCache } = require('../utils/cache');

// GET /api/hris/reports/attendance-monthly — Rekap kehadiran bulanan seluruh karyawan
exports.get_attendance_monthly = async (req, res) => {
    try {
        const { month, year } = req.query;
        const targetMonth = parseInt(month) || new Date().getMonth() + 1;
        const targetYear = parseInt(year) || new Date().getFullYear();

        const startDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();
        const endDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        // 1. Fetch all active employees
        const { data: employees, error: empErr } = await supabase
            .from('employees')
            .select(`
                id,
                nama_lengkap,
                nomor_pegawai,
                nik,
                jabatan,
                level,
                penempatan,
                departments (name)
            `)
            .order('nama_lengkap', { ascending: true });

        if (empErr) throw empErr;

        // 2. Fetch attendance logs in date range
        const { data: logs, error: logErr } = await supabase
            .from('attendance_logs')
            .select('*')
            .gte('date', startDateStr)
            .lte('date', endDateStr);

        if (logErr) throw logErr;

        // 3. Fetch leaves in date range
        const { data: leaves } = await supabase
            .from('leaves')
            .select('*')
            .lte('start_date', endDateStr)
            .gte('end_date', startDateStr)
            .eq('status', 'Approved');

        // Calculate work days in month (excluding Sundays)
        let totalWorkDays = 0;
        for (let d = 1; d <= lastDay; d++) {
            const dateObj = new Date(targetYear, targetMonth - 1, d);
            if (dateObj.getDay() !== 0) { // Exclude Sunday
                totalWorkDays++;
            }
        }

        // Map logs and leaves per employee
        const logMap = {};
        (logs || []).forEach(log => {
            if (!logMap[log.employee_id]) logMap[log.employee_id] = [];
            logMap[log.employee_id].push(log);
        });

        const leaveMap = {};
        (leaves || []).forEach(l => {
            if (!leaveMap[l.employee_id]) leaveMap[l.employee_id] = [];
            leaveMap[l.employee_id].push(l);
        });

        const report = (employees || []).map(emp => {
            const empLogs = logMap[emp.id] || [];
            const empLeaves = leaveMap[emp.id] || [];

            const hadirDays = new Set(empLogs.map(l => l.date)).size;
            let lateCount = 0;
            empLogs.forEach(l => {
                if (l.late_minutes > 0 || l.status === 'Terlambat') lateCount++;
            });

            let cutiDays = 0;
            let sakitDays = 0;
            let izinDays = 0;

            empLeaves.forEach(l => {
                const type = (l.leave_type || '').toLowerCase();
                if (type.includes('sakit')) sakitDays++;
                else if (type.includes('izin')) izinDays++;
                else cutiDays++;
            });

            const absentDays = Math.max(0, totalWorkDays - hadirDays - cutiDays - sakitDays - izinDays);
            let totalHours = 0;
            const mappedLogs = empLogs.map(l => {
                let dur = 0.0;
                if (l.check_in && l.check_out) {
                    const diff = (new Date(l.check_out) - new Date(l.check_in)) / (1000 * 60 * 60);
                    dur = (diff > 0 && diff < 24) ? +diff.toFixed(1) : 0.0;
                }
                totalHours += dur;
                return {
                    id: l.id,
                    date: l.date,
                    checkIn: l.check_in,
                    checkOut: l.check_out,
                    check_in_time: l.check_in ? new Date(l.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null,
                    check_out_time: l.check_out ? new Date(l.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null,
                    status: l.status || (l.late_minutes > 0 ? 'Terlambat' : 'Tepat Waktu'),
                    hours: dur,
                    late_minutes: l.late_minutes || 0,
                    device_info: l.device_info || 'Presensi Biometrik Wajah AI',
                    notes: l.notes || '',
                    created_at: l.created_at || l.check_in
                };
            }).sort((a, b) => new Date(b.date) - new Date(a.date));

            totalHours = +totalHours.toFixed(1);
            const attendancePercentage = totalWorkDays > 0 ? Math.min(100, Math.round((hadirDays / totalWorkDays) * 100)) : 0;
            const lastLog = mappedLogs.length > 0 ? mappedLogs[0] : null;

            return {
                id: emp.id,
                full_name: emp.nama_lengkap,
                name: emp.nama_lengkap,
                nip: emp.nomor_pegawai || emp.nik || '-',
                nik_internal: emp.nomor_pegawai || emp.nik || '-',
                division: emp.departments?.name || 'Operasional',
                jabatan: emp.jabatan,
                hadir: hadirDays,
                present_days: hadirDays,
                total_hours: totalHours,
                cuti: cutiDays,
                sakit: sakitDays,
                izin: izinDays,
                alpa: absentDays,
                terlambat: lateCount,
                persentase: attendancePercentage,
                last_log: lastLog,
                logs: mappedLogs
            };
        });

        res.json({
            month: targetMonth,
            year: targetYear,
            totalWorkDays,
            totalEmployees: (employees || []).length,
            report,
            data: report
        });
    } catch (err) {
        console.error('Error in get_attendance_monthly:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/reports/attendance-personal
exports.get_attendance_personal = async (req, res) => {
    try {
        const userId = req.userId;
        const { month, year } = req.query;
        const targetMonth = parseInt(month) || new Date().getMonth() + 1;
        const targetYear = parseInt(year) || new Date().getFullYear();

        const startDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();
        const endDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const { data: emp } = await supabase
            .from('employees')
            .select('id, nama_lengkap, nomor_pegawai, jabatan, departments(name)')
            .eq('user_id', userId)
            .maybeSingle();

        if (!emp) {
            return res.status(404).json({ message: 'Profil karyawan tidak ditemukan' });
        }

        const { data: logs } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('employee_id', emp.id)
            .gte('date', startDateStr)
            .lte('date', endDateStr)
            .order('date', { ascending: false });

        res.json({
            employee: emp,
            logs: logs || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/hris/reports/cleanup
exports.cleanup_old_data = async (req, res) => {
    try {
        const { year } = req.query;
        if (!year) return res.status(400).json({ message: 'Tahun cutoff wajib diisi' });

        const cutoffDate = `${year}-12-31`;
        await supabase.from('attendance_logs').delete().lte('date', cutoffDate);
        await supabase.from('leaves').delete().lte('end_date', cutoffDate);

        await invalidateCache('attendance:*');
        res.json({ message: `Data kehadiran sebelum ${year} berhasil dibersihkan` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
