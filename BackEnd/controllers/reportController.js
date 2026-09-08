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

        const cacheKey = `reports:monthly:${targetYear}:${targetMonth}`;
        const payload = await getOrSetCache(cacheKey, 30, async () => {
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

        // Operasional Site PT DEA GLOBAL NIAGA:
        // Hari kerja aktif Senin s/d Minggu penuh (tidak ada libur mingguan statis karena tambang beroperasi 24/7).
        // Hari libur resmi pekerja mengikuti siklus Roster:
        // 1. Off 13/1 (13 hari kerja, 1 hari off berputar).
        // 2. Cuti Roster 8/2 (8 minggu on-site, 2 minggu cuti) atau 6/2 (PJO/khusus).
        const totalWorkDays = lastDay; // Full calendar operational days (30 hari di Sept, 31 hari di Ags/Okt)

        // Evaluasi hari berjalan untuk bulan ini (agar alpa tidak menghitung tanggal di masa depan)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();

        let evaluatedDays = totalWorkDays;
        if (targetYear > currentYear || (targetYear === currentYear && targetMonth > currentMonth)) {
            evaluatedDays = 0; // Bulan di masa depan
        } else if (targetYear === currentYear && targetMonth === currentMonth) {
            evaluatedDays = Math.min(lastDay, currentDay); // Bulan sedang berjalan sampai hari ini
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
                // Hitung overlap tanggal cuti/libur roster dengan bulan yang dievaluasi
                const lStart = l.start_date < startDateStr ? startDateStr : l.start_date;
                const lEnd = l.end_date > endDateStr ? endDateStr : l.end_date;
                let overlapDays = 0;
                if (lStart <= lEnd) {
                    const d1 = new Date(lStart);
                    const d2 = new Date(lEnd);
                    overlapDays = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
                }

                const type = (l.leave_type || '').toLowerCase();
                if (type.includes('sakit')) {
                    sakitDays += overlapDays;
                } else if (type.includes('izin')) {
                    izinDays += overlapDays;
                } else {
                    // Cuti Roster (8/2 atau 6/2), Libur 13/1, Cuti Tahunan
                    cutiDays += overlapDays;
                }
            });

            // Alpa dihitung dari hari kerja yang sudah berjalan dikurangi kehadiran dan izin/cuti/sakit yang sah
            const absentDays = Math.max(0, evaluatedDays - hadirDays - cutiDays - sakitDays - izinDays);
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
            
            // Persentase kehadiran dihitung terhadap hari yang dievaluasi (atau total hari kerja bulan penuh jika bulan telah selesai)
            const denominator = evaluatedDays > 0 ? evaluatedDays : totalWorkDays;
            const attendancePercentage = denominator > 0 ? Math.min(100, Math.round((hadirDays / denominator) * 100)) : 0;
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

            return {
                month: targetMonth,
                year: targetYear,
                totalWorkDays,
                totalEmployees: (employees || []).length,
                report,
                data: report
            };
        });

        res.json(payload);
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
