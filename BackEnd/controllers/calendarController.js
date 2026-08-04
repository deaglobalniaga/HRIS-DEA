const supabase = require('../config/supabaseClient');

// GET /calendar/events - Get calendar data for a specific month (includes leaves, permissions, and company events)
exports.get_calendar_events = async (req, res) => {
    try {
        const { month, year } = req.query;
        const targetMonth = parseInt(month) || new Date().getMonth() + 1;
        const targetYear = parseInt(year) || new Date().getFullYear();

        const startDate = new Date(targetYear, targetMonth - 1, 1).toISOString().split('T')[0];
        // Last day of the month
        const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

        // 1. Get approved leaves
        const { data: leaves, error: leavesErr } = await supabase
            .from('leaves')
            .select('*, users(full_name)')
            .eq('status', 'Approved')
            .or(`leave_start.lte.${endDate},leave_end.gte.${startDate}`);
            
        if (leavesErr) throw leavesErr;

        // 2. Get approved permissions
        const { data: permissions, error: permsErr } = await supabase
            .from('permissions')
            .select('*, users(full_name)')
            .eq('status', 'Approved')
            .gte('date', startDate)
            .lte('date', endDate);

        if (permsErr) throw permsErr;

        // 3. Get company events
        const { data: events, error: eventsErr } = await supabase
            .from('events')
            .select('*')
            .gte('event_date', startDate)
            .lte('event_date', endDate);
            
        if (eventsErr) throw eventsErr;

        // Format data for the frontend calendar
        const calendarData = [];

        // Format Leaves
        (leaves || []).forEach(leave => {
            calendarData.push({
                id: `leave_${leave.id}`,
                type: 'leave',
                title: `${leave.users?.full_name || 'Karyawan'} - Cuti`,
                start: leave.leave_start,
                end: leave.leave_end,
                allDay: true,
                description: leave.reason
            });
        });

        // Format Permissions
        (permissions || []).forEach(perm => {
            calendarData.push({
                id: `perm_${perm.id}`,
                type: 'permission',
                subType: perm.type, // 'Sakit', 'Izin', dll
                title: `${perm.users?.full_name || 'Karyawan'} - ${perm.type}`,
                start: perm.date,
                end: perm.date,
                allDay: true,
                description: perm.reason
            });
        });

        // Format Events
        (events || []).forEach(event => {
            calendarData.push({
                id: `event_${event.id}`,
                type: 'event',
                title: event.title,
                start: event.event_date,
                end: event.event_date,
                allDay: true,
                description: event.description,
                dbId: event.id
            });
        });

        res.json(calendarData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /calendar/events - Create a new company event
exports.post_event = async (req, res) => {
    try {
        const role = (req.userRole || '').toLowerCase();
        if (!role.includes('admin') && !role.includes('hr')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { title, description, event_date } = req.body;
        
        if (!title || !event_date) {
            return res.status(400).json({ error: 'Title and event_date are required' });
        }

        const { data, error } = await supabase
            .from('events')
            .insert([{ title, description, event_date }]);

        if (error) throw error;
        res.status(201).json({ message: 'Event created successfully', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /calendar/events/:id - Delete a company event
exports.delete_event = async (req, res) => {
    try {
        const role = (req.userRole || '').toLowerCase();
        if (!role.includes('admin') && !role.includes('hr')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Event deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
