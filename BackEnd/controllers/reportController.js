const User = require('../models/User');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const KPIAppraisal = require('../models/KPIAppraisal');

// GET /reports/attendance-monthly — Rekap kehadiran bulanan seluruh karyawan
exports.get_attendance_monthly = async (req, res) => {
    try {
        const { month, year } = req.query;
        const targetMonth = parseInt(month) || new Date().getMonth() + 1;
        const targetYear = parseInt(year) || new Date().getFullYear();

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        // Get all users
        const users = await User.find().populate('department').sort({ nama: 1 });

        // Get attendance in date range
        const attendance = await Attendance.find({
            tanggal: { $gte: startDate, $lte: endDate }
        });

        // Get leaves in date range (including permissions)
        const leaves = await LeaveRequest.find({
            status: 'Approved',
            $or: [
                { start_date: { $lte: endDate }, end_date: { $gte: startDate } }
            ]
        });

        // Calculate total work days (exclude weekends)
        let totalWorkDays = 0;
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (d.getDay() !== 0 && d.getDay() !== 6) totalWorkDays++;
        }

        // Build report per user
        const report = users.map(user => {
            // Count unique check-in days
            const userAtt = attendance.filter(a => a.user.toString() === user._id.toString() && a.check_in);
            const uniqueCheckInDays = new Set(userAtt.map(a => new Date(a.tanggal).toDateString())).size;

            // Count approved leaves
            const userLeaves = leaves.filter(l => l.user.toString() === user._id.toString() && l.leave_type === 'Cuti');
            let leaveDays = 0;
            userLeaves.forEach(l => {
                const ls = new Date(Math.max(new Date(l.start_date), startDate));
                const le = new Date(Math.min(new Date(l.end_date), endDate));
                const diff = Math.ceil((le - ls) / (1000 * 60 * 60 * 24)) + 1;
                leaveDays += Math.max(0, diff);
            });

            // Count approved permissions (sick/izin)
            const userPerms = leaves.filter(l => l.user.toString() === user._id.toString() && l.leave_type !== 'Cuti');
            const sickDays = userPerms.filter(p => (p.leave_type || '').toLowerCase().includes('sakit')).length;
            const izinDays = userPerms.filter(p => (p.leave_type || '').toLowerCase().includes('izin')).length;

            const absentDays = Math.max(0, totalWorkDays - uniqueCheckInDays - leaveDays - sickDays - izinDays);

            // Calculate late check-ins (after 08:30)
            let lateDays = 0;
            const checkInsByDay = {};
            userAtt.forEach(a => {
                const ts = new Date(a.check_in);
                const dayKey = ts.toDateString();
                if (!checkInsByDay[dayKey]) {
                    checkInsByDay[dayKey] = ts;
                    const hours = ts.getHours();
                    const minutes = ts.getMinutes();
                    if (hours > 8 || (hours === 8 && minutes > 30)) lateDays++;
                }
            });

            return {
                id: user._id.toString(),
                full_name: user.nama || user.full_name,
                nik_internal: user.nik_internal || user.nik || '-',
                division: user.department?.name || '-',
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
            totalEmployees: users.length,
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
        const user = await User.findById(userId).populate('department');

        // Get daily attendance detail
        const attendance = await Attendance.find({
            user: userId,
            tanggal: { $gte: startDate, $lte: endDate }
        }).sort({ tanggal: 1 });

        // Build daily detail
        const dailyDetail = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayKey = d.toDateString();
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);

            const dayAtt = attendance.filter(a => {
                const ts = new Date(a.tanggal);
                return ts >= d && ts < nextDay;
            });

            const attRecord = dayAtt[0]; // Assuming 1 record per day per user
            const checkIn = attRecord?.check_in;
            const checkOut = attRecord?.check_out;
            const photoUrl = attRecord?.photo_url || null; // Add if schema has photo
            
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;

            dailyDetail.push({
                date: new Date(d).toISOString().split('T')[0],
                day: d.toLocaleDateString('id-ID', { weekday: 'short' }),
                checkIn: checkIn ? new Date(checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null,
                checkOut: checkOut ? new Date(checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null,
                status: isWeekend ? 'Libur' : (checkIn ? 'Hadir' : (d < new Date() ? 'Tidak Hadir' : '-')),
                photoUrl: photoUrl
            });
        }

        res.json({
            user: user ? {
                id: user._id,
                full_name: user.nama || user.full_name,
                nik_internal: user.nik_internal || user.nik,
                division: user.department?.name,
                role: user.role,
                job_title: user.job_title
            } : {},
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
        const attendance = await Attendance.find({
            tanggal: { $gte: startDate, $lte: endDate }
        }).populate({
            path: 'user',
            populate: { path: 'department' }
        }).sort({ tanggal: -1 });

        const logs = [];
        attendance.forEach(a => {
            if (a.check_in) {
                logs.push({
                    id: a._id.toString() + '_in',
                    type: 'Check In',
                    timestamp: a.check_in,
                    photo_url: a.photo_url || null,
                    user_id: a.user?._id,
                    users: {
                        id: a.user?._id,
                        full_name: a.user?.nama || a.user?.full_name,
                        division: a.user?.department?.name || 'Unassigned'
                    }
                });
            }
            if (a.check_out) {
                logs.push({
                    id: a._id.toString() + '_out',
                    type: 'Check Out',
                    timestamp: a.check_out,
                    photo_url: a.photo_url || null,
                    user_id: a.user?._id,
                    users: {
                        id: a.user?._id,
                        full_name: a.user?.nama || a.user?.full_name,
                        division: a.user?.department?.name || 'Unassigned'
                    }
                });
            }
        });
        
        // sort logs by timestamp desc
        logs.sort((x, y) => new Date(y.timestamp) - new Date(x.timestamp));

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
        const user = await User.findById(req.userId);
        if (!user || (!user.role.toLowerCase().includes('admin') && !user.role.toLowerCase().includes('hr') && user.role !== 'superadmin')) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        const cutoffDate = new Date(`${year}-01-01T00:00:00Z`);

        // Delete old attendance logs
        await Attendance.deleteMany({ tanggal: { $lt: cutoffDate } });
        // Delete old leaves and permissions
        await LeaveRequest.deleteMany({ start_date: { $lt: cutoffDate } });
        // Delete old performance goals (KPIAppraisal)
        await KPIAppraisal.deleteMany({ evaluation_date: { $lt: cutoffDate } });

        res.json({ message: `Successfully cleared data before ${year}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
