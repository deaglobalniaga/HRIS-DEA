const supabase = require('../config/supabaseClient');

// GET /reports/attendance-monthly — Rekap kehadiran bulanan seluruh karyawan
exports.get_attendance_monthly = async (req, res) => {
    try {
        const { month, year } = req.query;
        const targetMonth = parseInt(month) || new Date().getMonth() + 1;
        const targetYear = parseInt(year) || new Date().getFullYear();

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        // Get all users
        const { data: users } = await supabase
            .from('users')
            .select('id, full_name, nik_internal, division, role')
            .order('full_name', { ascending: true });

        // Get attendance in date range
        const { data: attendance } = await supabase
            .from('attendance')
            .select('user_id, type, timestamp')
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString());

        // Get leaves in date range
        const { data: leaves } = await supabase
            .from('leaves')
            .select('user_id, status, leave_start, leave_end')
            .or(`leave_start.lte.${endDate.toISOString()},leave_end.gte.${startDate.toISOString()}`);

        // Get permissions in date range
        const { data: permissions } = await supabase
            .from('permissions')
            .select('user_id, type, status, date')
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0]);

        // Calculate total work days (exclude weekends)
        let totalWorkDays = 0;
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (d.getDay() !== 0 && d.getDay() !== 6) totalWorkDays++;
        }

        // Build report per user
        const report = (users || []).map(user => {
            // Count unique check-in days
            const userAtt = (attendance || []).filter(a => a.user_id === user.id && a.type === 'Check In');
            const uniqueCheckInDays = new Set(userAtt.map(a => new Date(a.timestamp).toDateString())).size;

            // Count approved leaves
            const userLeaves = (leaves || []).filter(l => l.user_id === user.id && l.status === 'Approved');
            let leaveDays = 0;
            userLeaves.forEach(l => {
                const ls = new Date(Math.max(new Date(l.leave_start), startDate));
                const le = new Date(Math.min(new Date(l.leave_end), endDate));
                const diff = Math.ceil((le - ls) / (1000 * 60 * 60 * 24)) + 1;
                leaveDays += Math.max(0, diff);
            });

            // Count approved permissions (sick/izin)
            const userPerms = (permissions || []).filter(p => p.user_id === user.id && p.status === 'Approved');
            const sickDays = userPerms.filter(p => p.type === 'Sakit').length;
            const izinDays = userPerms.filter(p => p.type !== 'Sakit').length;

            const absentDays = Math.max(0, totalWorkDays - uniqueCheckInDays - leaveDays - sickDays - izinDays);

            // Calculate late check-ins (after 08:30)
            let lateDays = 0;
            const checkInsByDay = {};
            userAtt.forEach(a => {
                const ts = new Date(a.timestamp);
                const dayKey = ts.toDateString();
                if (!checkInsByDay[dayKey]) {
                    checkInsByDay[dayKey] = ts;
                    const hours = ts.getHours();
                    const minutes = ts.getMinutes();
                    if (hours > 8 || (hours === 8 && minutes > 30)) lateDays++;
                }
            });

            return {
                id: user.id,
                full_name: user.full_name,
                nik_internal: user.nik_internal,
                division: user.division || '-',
                role: user.role,
                hadir: uniqueCheckInDays,
                cuti: leaveDays,
                sakit: sickDays,
                izin: izinDays,
                alpa: absentDays,
                terlambat: lateDays,
                persentase: totalWorkDays > 0 ? Math.round((uniqueCheckInDays / totalWorkDays) * 100) : 0
            };
        });

        res.json({
            month: targetMonth,
            year: targetYear,
            totalWorkDays,
            totalEmployees: (users || []).length,
            report
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /reports/attendance-personal — Rekap kehadiran per karyawan
exports.get_attendance_personal = async (req, res) => {
    try {
        const userId = req.query.user_id || req.userId;
        const { month, year } = req.query;
        const targetMonth = parseInt(month) || new Date().getMonth() + 1;
        const targetYear = parseInt(year) || new Date().getFullYear();

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        // Get user profile
        const { data: user } = await supabase
            .from('users')
            .select('id, full_name, nik_internal, division, role, job_title')
            .eq('id', userId)
            .single();

        // Get daily attendance detail
        const { data: attendance } = await supabase
            .from('attendance')
            .select('type, timestamp, photo_url')
            .eq('user_id', userId)
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString())
            .order('timestamp', { ascending: true });

        // Build daily detail
        const dailyDetail = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayKey = d.toDateString();
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);

            const dayAtt = (attendance || []).filter(a => {
                const ts = new Date(a.timestamp);
                return ts >= d && ts < nextDay;
            });

            const checkIn = dayAtt.find(a => a.type === 'Check In');
            const checkOut = dayAtt.find(a => a.type === 'Check Out');

            const isWeekend = d.getDay() === 0 || d.getDay() === 6;

            dailyDetail.push({
                date: new Date(d).toISOString().split('T')[0],
                day: d.toLocaleDateString('id-ID', { weekday: 'short' }),
                checkIn: checkIn ? new Date(checkIn.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null,
                checkOut: checkOut ? new Date(checkOut.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null,
                status: isWeekend ? 'Libur' : (checkIn ? 'Hadir' : (d < new Date() ? 'Tidak Hadir' : '-')),
                photoUrl: checkIn?.photo_url || null
            });
        }

        res.json({
            user: user || {},
            month: targetMonth,
            year: targetYear,
            dailyDetail
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /reports/attendance-log — Menampilkan log raw kehadiran beserta foto (bisa difilter harian/mingguan/bulanan)
exports.get_attendance_log = async (req, res) => {
    try {
        const { range } = req.query; // 'day', 'week', 'month', '6months'
        const endDate = new Date();
        let startDate = new Date();

        // Tentukan batas waktu mulai
        startDate.setHours(0, 0, 0, 0); // Default ke hari ini
        endDate.setHours(23, 59, 59, 999);

        if (range === 'week') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (range === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
        } else if (range === '6months') {
            startDate.setMonth(startDate.getMonth() - 6);
        }

        // Ambil data attendance beserta relasi user
        const { data: logs, error } = await supabase
            .from('attendance')
            .select(`
                id,
                type,
                timestamp,
                photo_url,
                user_id,
                users ( id, full_name, division )
            `)
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString())
            .order('timestamp', { ascending: false });

        if (error) throw error;

        res.json({ logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /reports/cleanup - Hapus data lama (Admin only)
exports.cleanup_old_data = async (req, res) => {
    try {
        const { year } = req.query;
        if (!year) return res.status(400).json({ error: 'Year parameter is required' });

        // Ensure admin or HR
        const { data: user } = await supabase.from('users').select('role').eq('id', req.userId).single();
        if (!user || (!user.role.toLowerCase().includes('admin') && !user.role.toLowerCase().includes('hr'))) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        const cutoffDate = new Date(`${year}-01-01T00:00:00Z`).toISOString();

        // Delete old attendance logs
        await supabase.from('attendance').delete().lt('timestamp', cutoffDate);
        // Delete old permissions
        await supabase.from('permissions').delete().lt('date', cutoffDate.split('T')[0]);
        // Delete old leaves
        await supabase.from('leaves').delete().lt('leave_end', cutoffDate);
        // Delete old performance goals
        await supabase.from('performance_goals').delete().lt('created_at', cutoffDate);

        res.json({ message: `Successfully cleared data before ${year}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
