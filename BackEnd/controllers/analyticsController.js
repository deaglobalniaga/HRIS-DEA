const User = require('../models/User');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');

exports.get_trend = async (req, res) => {
    try {
        const adminRoles = ['admin', 'hr', 'pjo'];
        if (!adminRoles.includes((req.userRole || '').toLowerCase()) && req.userRole !== 'superadmin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { months = 6 } = req.query;
        const dateLimit = new Date();
        dateLimit.setMonth(dateLimit.getMonth() - parseInt(months));

        // Fetch attendance records from the last X months
        const attendanceData = await Attendance.find({
            tanggal: { $gte: dateLimit },
            check_in: { $ne: null }
        }).select('tanggal status');
        
        // Also we need permission data for Sick / Permission trends
        const leaveData = await LeaveRequest.find({
            start_date: { $gte: dateLimit },
            status: 'Approved'
        });

        // Group by month
        const monthlyData = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

        // Initialize last X months
        for (let i = parseInt(months) - 1; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const mKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            monthlyData[mKey] = { name: mKey, hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpha: 0 };
        }

        attendanceData.forEach(record => {
            if (!record.tanggal) return;
            const dateObj = new Date(record.tanggal);
            const monthKey = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

            if (!monthlyData[monthKey]) return; // Skip if older

            const status = (record.status || '').toLowerCase();
            monthlyData[monthKey].hadir += 1;
            
            if (status.includes('late') || status.includes('terlambat')) {
                monthlyData[monthKey].terlambat += 1;
            }
        });
        
        leaveData.forEach(record => {
            if (!record.start_date) return;
            const dateObj = new Date(record.start_date);
            const monthKey = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
            
            if (!monthlyData[monthKey]) return;
            
            const type = (record.leave_type || '').toLowerCase();
            if (type.includes('izin') || type.includes('permission')) {
                monthlyData[monthKey].izin += 1;
            } else if (type.includes('sakit') || type.includes('sick')) {
                monthlyData[monthKey].sakit += 1;
            }
        });

        const trendArray = Object.values(monthlyData);
        res.json(trendArray);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.get_heatmap = async (req, res) => {
    try {
        const adminRoles = ['admin', 'hr', 'pjo'];
        if (!adminRoles.includes((req.userRole || '').toLowerCase()) && req.userRole !== 'superadmin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 30);

        const attendanceData = await Attendance.find({
            tanggal: { $gte: dateLimit },
            check_in: { $ne: null }
        }).select('tanggal status');
        
        const leaveData = await LeaveRequest.find({
            start_date: { $gte: dateLimit },
            status: 'Approved'
        });

        // Count frequencies per date
        const heatmapData = {};
        
        for(let i=30; i>=0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            heatmapData[dStr] = { date: dStr, count: 0, late: 0, absent: 0 };
        }

        attendanceData.forEach(record => {
            if (!record.tanggal) return;
            const dStr = new Date(record.tanggal).toISOString().split('T')[0];
            if (!heatmapData[dStr]) {
                heatmapData[dStr] = { date: dStr, count: 0, late: 0, absent: 0 };
            }
            heatmapData[dStr].count += 1;
            
            const status = (record.status || '').toLowerCase();
            if (status.includes('late') || status.includes('terlambat')) {
                heatmapData[dStr].late += 1;
            }
        });
        
        leaveData.forEach(record => {
            if (!record.start_date) return;
            const dStr = new Date(record.start_date).toISOString().split('T')[0];
            if (heatmapData[dStr]) {
                heatmapData[dStr].absent += 1;
            }
        });

        const result = Object.values(heatmapData).sort((a, b) => new Date(a.date) - new Date(b.date));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.get_division_stats = async (req, res) => {
    try {
        const adminRoles = ['admin', 'hr', 'pjo'];
        if (!adminRoles.includes((req.userRole || '').toLowerCase()) && req.userRole !== 'superadmin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

        const attendanceData = await Attendance.find({
            tanggal: { $gte: startOfMonth },
            check_in: { $ne: null }
        }).populate({
            path: 'user',
            populate: { path: 'department' }
        });

        const divStats = {};
        attendanceData.forEach(record => {
            if (!record.user) return;
            const div = (record.user.department && record.user.department.name) ? record.user.department.name : 'Unassigned';
            if (!divStats[div]) {
                divStats[div] = { subject: div, A: 0, B: 0, fullMark: 100 };
            }
            
            divStats[div].A += 1;
            const status = (record.status || '').toLowerCase();
            if (status.includes('late') || status.includes('terlambat')) {
                divStats[div].B += 1;
            }
        });

        const result = Object.values(divStats).map(stat => {
            const total = stat.A + stat.B;
            if (total === 0) return stat;
            
            const attendanceScore = Math.min(100, Math.round((stat.A / (stat.A + (stat.B * 0.5))) * 100));
            const disciplineScore = Math.min(100, Math.round(100 - ((stat.B / stat.A) * 100)));
            
            return {
                subject: stat.subject,
                Kehadiran: attendanceScore || 100,
                Kedisiplinan: disciplineScore > 0 ? disciplineScore : 0,
                fullMark: 100
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
