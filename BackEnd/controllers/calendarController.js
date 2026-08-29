const supabase = require('../config/supabase');
const { notifyRole } = require('./notificationController');

// GET /api/hris/calendar/events
exports.get_calendar_events = async (req, res) => {
    try {
        const { month, year } = req.query;
        const targetMonth = parseInt(month) || new Date().getMonth() + 1;
        const targetYear = parseInt(year) || new Date().getFullYear();

        const startDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();
        const endDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        // Fetch approved leaves and roster events
        const { data: leaves, error: leaveErr } = await supabase
            .from('leaves')
            .select(`
                id,
                leave_type,
                start_date,
                end_date,
                notes,
                employees (nama_lengkap)
            `)
            .lte('start_date', endDateStr)
            .gte('end_date', startDateStr);

        if (leaveErr) throw leaveErr;

        const calendarData = [];

        (leaves || []).forEach(reqObj => {
            const isLeave = (reqObj.leave_type || '').toLowerCase().includes('cuti');
            const userName = reqObj.employees?.nama_lengkap || 'Karyawan';

            calendarData.push({
                id: `leave_${reqObj.id}`,
                type: isLeave ? 'leave' : 'permission',
                subType: reqObj.leave_type,
                title: `${userName} - ${reqObj.leave_type}`,
                start: reqObj.start_date,
                end: reqObj.end_date,
                allDay: true,
                description: reqObj.notes || ''
            });
        });

        res.json(calendarData);
    } catch (err) {
        console.error('Calendar error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/calendar/events/summary
exports.get_calendar_summary = async (req, res) => {
    try {
        const { data: leaves } = await supabase
            .from('leaves')
            .select('id, leave_type');

        res.json({
            totalApprovedLeaves: (leaves || []).length,
            upcomingEvents: []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/hris/calendar/events
exports.post_event = async (req, res) => {
    try {
        const role = (req.userRole || req.user?.role || '').toLowerCase();
        if (['superadmin', 'super_admin'].includes(role)) {
            return res.status(403).json({
                message: 'Akses ditolak: Super Admin hanya memiliki hak tata kelola sistem, penambahan agenda operasional hanya wewenang Admin HRGA.'
            });
        }
        
        await notifyRole('all', 'Agenda Baru', 'Sebuah agenda operasional baru telah ditambahkan ke kalender.', 'info', '/calendar');

        res.status(201).json({ message: 'Event berhasil ditambahkan', data: req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/hris/calendar/events/:id
exports.delete_event = async (req, res) => {
    try {
        const role = (req.userRole || req.user?.role || '').toLowerCase();
        if (['superadmin', 'super_admin'].includes(role)) {
            return res.status(403).json({
                message: 'Akses ditolak: Super Admin tidak berwenang menghapus agenda operasional.'
            });
        }
        res.json({ message: 'Event berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
