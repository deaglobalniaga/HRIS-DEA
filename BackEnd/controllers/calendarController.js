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

        // 1. Fetch approved leaves and roster events
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

        // 2. Fetch operational agendas from calendar_events
        const { data: eventsList, error: evtErr } = await supabase
            .from('calendar_events')
            .select('*')
            .lte('event_date', endDateStr)
            .gte('event_end_date', startDateStr);

        if (evtErr) {
            console.warn('Warning reading calendar_events:', evtErr.message);
        }

        const calendarData = [];

        // Format leaves
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

        // Format operational agendas
        (eventsList || []).forEach(evt => {
            calendarData.push({
                id: `event_${evt.id}`,
                type: 'event',
                subType: evt.category,
                title: evt.title,
                start: evt.event_date,
                end: evt.event_end_date || evt.event_date,
                allDay: false,
                time: evt.time || '',
                location: evt.location || '',
                description: evt.description || '',
                category: evt.category,
                created_by: evt.created_by
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

        const { data: eventsList } = await supabase
            .from('calendar_events')
            .select('id, title, event_date, time, category')
            .gte('event_date', new Date().toISOString().split('T')[0])
            .order('event_date', { ascending: true })
            .limit(5);

        res.json({
            totalApprovedLeaves: (leaves || []).length,
            upcomingEvents: eventsList || []
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
                message: 'Akses ditolak: Super Admin hanya memiliki hak tata kelola sistem. Penambahan agenda hanya wewenang Admin HRGA & Admin HSE.'
            });
        }

        const { title, category, description, time, location, event_date, event_end_date } = req.body;
        if (!title || !event_date) {
            return res.status(400).json({ message: 'Judul dan tanggal agenda wajib diisi.' });
        }

        const { data: newEvt, error: insErr } = await supabase
            .from('calendar_events')
            .insert({
                title,
                category: category || 'Rapat Internal',
                description: description || '',
                time: time || '',
                location: location || '',
                event_date,
                event_end_date: event_end_date || event_date,
                created_by: req.userId || null
            })
            .select()
            .single();

        if (insErr) throw insErr;

        await notifyRole('all', 'Agenda Baru', `Agenda baru: ${title}`, 'info', '/calendar');

        res.status(201).json({ message: 'Agenda berhasil ditambahkan', data: newEvt });
    } catch (err) {
        console.error('Create calendar event error:', err);
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

        const { id } = req.params;
        const cleanId = id.replace(/^event_/, '').replace(/^leave_/, '');
        
        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', cleanId);

        if (error) throw error;
        res.json({ message: 'Agenda operasional berhasil dihapus' });
    } catch (err) {
        console.error('Delete event error:', err);
        res.status(500).json({ error: err.message });
    }
};
