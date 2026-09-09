const supabase = require('../config/supabase');
const { notifyRole } = require('./notificationController');
const { logAdminActivity } = require('../utils/auditLogger');

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
                duration_days,
                notes,
                document_url,
                employees (id, nama_lengkap, jabatan, departments(name))
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
            const rawType = (reqObj.leave_type || '').toLowerCase();
            const userName = reqObj.employees?.nama_lengkap || 'Karyawan';
            const jobTitle = reqObj.employees?.jabatan || 'Staff Operasional';
            const deptName = reqObj.employees?.departments?.name || 'Operasional Site';


            let eventType = 'leave';
            if (rawType.includes('roster') || rawType.includes('13/1') || rawType.includes('off')) {
                eventType = 'roster_leave';
            } else if (rawType.includes('sakit') || rawType.includes('sick')) {
                eventType = 'sakit';
            } else if (rawType.includes('izin') || rawType.includes('permission')) {
                eventType = 'izin';
            }

            calendarData.push({
                id: `leave_${reqObj.id}`,
                raw_id: reqObj.id,
                type: eventType,
                subType: reqObj.leave_type,
                title: `${userName} - ${reqObj.leave_type}`,
                employee_name: userName,
                job_title: jobTitle,
                department: deptName,
                start: reqObj.start_date,
                end: reqObj.end_date,
                duration_days: reqObj.duration_days,
                allDay: true,
                description: reqObj.notes || '',
                document_url: reqObj.document_url || null,
                is_leave: true
            });
        });

        // Format operational agendas
        (eventsList || []).forEach(evt => {
            calendarData.push({
                id: `event_${evt.id}`,
                raw_id: evt.id,
                type: 'event',
                subType: evt.category || 'Rapat Internal',
                title: evt.title,
                start: evt.event_date,
                end: evt.event_end_date || evt.event_date,
                allDay: false,
                time: evt.time || '',
                location: evt.location || '',
                description: evt.description || '',
                category: evt.category || 'Rapat Internal',
                created_by: evt.created_by,
                is_agenda: true
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
        const isSuperAdmin = ['superadmin', 'super_admin'].includes(role) || role.includes('super');
        const isUser = ['user', 'karyawan', 'employee'].includes(role) || !role;
        if (isSuperAdmin) {
            return res.status(403).json({
                message: 'Akses ditolak: Super Admin hanya memiliki hak tata kelola sistem. Pengelolaan agenda hanya wewenang Admin.'
            });
        }
        if (isUser) {
            return res.status(403).json({
                message: 'Akses ditolak: Role Karyawan tidak memiliki wewenang untuk menambah agenda operasional.'
            });
        }

        const { title, category, description, time, location, event_date, event_end_date } = req.body;
        if (!title || !event_date) {
            return res.status(400).json({ message: 'Judul dan tanggal agenda wajib diisi.' });
        }

        const cleanTitle = title.replace(/^\[.*?\]\s*/, '');
        const formattedTitle = `[${category || 'Rapat Internal'}] ${cleanTitle}`;

        const { data: newEvt, error: insErr } = await supabase
            .from('calendar_events')
            .insert({
                title: formattedTitle,
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

        // Log Admin Audit Trail
        await logAdminActivity({
            userId: req.userId,
            action: 'Agenda Baru Dibuat',
            details: `Admin membuat agenda operasional baru: "${formattedTitle}" pada tanggal ${event_date}${time ? ' jam ' + time : ''}.`,
            req
        });

        await notifyRole('all', 'Agenda Baru', `Agenda baru: ${formattedTitle}`, 'info', '/calendar');

        res.status(201).json({ message: 'Agenda berhasil ditambahkan', data: newEvt });
    } catch (err) {
        console.error('Create calendar event error:', err);
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/hris/calendar/events/:id (Edit Operational Agenda)
exports.put_event = async (req, res) => {
    try {
        const role = (req.userRole || req.user?.role || '').toLowerCase();
        const isSuperAdmin = ['superadmin', 'super_admin'].includes(role) || role.includes('super');
        const isUser = ['user', 'karyawan', 'employee'].includes(role) || !role;
        if (isSuperAdmin) {
            return res.status(403).json({
                message: 'Akses ditolak: Super Admin tidak berwenang mengubah agenda operasional.'
            });
        }
        if (isUser) {
            return res.status(403).json({
                message: 'Akses ditolak: Role Karyawan tidak memiliki wewenang untuk mengubah agenda operasional.'
            });
        }

        const { id } = req.params;
        const cleanId = id.replace(/^event_/, '').replace(/^leave_/, '');
        const { title, category, description, time, location, event_date, event_end_date } = req.body;

        if (!title || !event_date) {
            return res.status(400).json({ message: 'Judul dan tanggal agenda wajib diisi.' });
        }

        const cleanTitle = title.replace(/^\[.*?\]\s*/, '');
        const formattedTitle = `[${category || 'Rapat Internal'}] ${cleanTitle}`;

        const { data: updated, error } = await supabase
            .from('calendar_events')
            .update({
                title: formattedTitle,
                category: category || 'Rapat Internal',
                description: description || '',
                time: time || '',
                location: location || '',
                event_date,
                event_end_date: event_end_date || event_date,
                updated_at: new Date()
            })
            .eq('id', cleanId)
            .select()
            .single();

        if (error) throw error;

        // Log Admin Audit Trail
        await logAdminActivity({
            userId: req.userId,
            action: 'Agenda Diperbarui',
            details: `Admin memperbarui agenda operasional: "${formattedTitle}" (${event_date}${event_end_date && event_end_date !== event_date ? ' s/d ' + event_end_date : ''}).`,
            req
        });

        res.json({ message: 'Agenda berhasil diperbarui!', data: updated });
    } catch (err) {
        console.error('Update calendar event error:', err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/hris/calendar/events/:id
exports.delete_event = async (req, res) => {
    try {
        const role = (req.userRole || req.user?.role || '').toLowerCase();
        const isSuperAdmin = ['superadmin', 'super_admin'].includes(role) || role.includes('super');
        const isUser = ['user', 'karyawan', 'employee'].includes(role) || !role;
        if (isSuperAdmin) {
            return res.status(403).json({
                message: 'Akses ditolak: Super Admin tidak berwenang menghapus agenda operasional.'
            });
        }
        if (isUser) {
            return res.status(403).json({
                message: 'Akses ditolak: Role Karyawan tidak memiliki wewenang untuk menghapus agenda operasional.'
            });
        }

        const { id } = req.params;
        const cleanId = id.replace(/^event_/, '').replace(/^leave_/, '');

        // Fetch event title for audit trail before deleting
        const { data: existingEvt } = await supabase
            .from('calendar_events')
            .select('title, event_date')
            .eq('id', cleanId)
            .maybeSingle();

        const evtTitle = existingEvt?.title || 'Agenda Operasional';
        const evtDate = existingEvt?.event_date || '';
        
        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', cleanId);

        if (error) throw error;

        // Log Admin Audit Trail
        await logAdminActivity({
            userId: req.userId,
            action: 'Agenda Dihapus',
            details: `Admin menghapus agenda operasional: "${evtTitle}" (${evtDate}).`,
            req
        });

        res.json({ message: 'Agenda operasional berhasil dihapus' });
    } catch (err) {
        console.error('Delete event error:', err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE/POST /api/hris/calendar/events/clear-month (Pembersihan Agenda Bulanan Khusus Admin HRGA & HSE)
exports.clear_month_events = async (req, res) => {
    try {
        const role = (req.userRole || req.user?.role || '').toLowerCase();
        const isSuperAdmin = ['superadmin', 'super_admin'].includes(role) || role.includes('super');
        const isUser = ['user', 'karyawan', 'employee'].includes(role) || !role;
        if (isSuperAdmin) {
            return res.status(403).json({
                message: 'Akses ditolak: Super Admin tidak berwenang membersihkan agenda operasional.'
            });
        }
        if (isUser) {
            return res.status(403).json({
                message: 'Akses ditolak: Role Karyawan tidak memiliki wewenang membersihkan agenda bulanan.'
            });
        }

        const targetMonth = parseInt(req.body.month || req.query.month);
        const targetYear = parseInt(req.body.year || req.query.year);

        if (!targetMonth || !targetYear || targetMonth < 1 || targetMonth > 12 || targetYear < 2020) {
            return res.status(400).json({ message: 'Bulan (1-12) dan Tahun valid wajib disertakan.' });
        }

        const startDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();
        const endDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        // Find events strictly in that month to count & delete
        const { data: toDelete, error: findErr } = await supabase
            .from('calendar_events')
            .select('id, title')
            .gte('event_date', startDateStr)
            .lte('event_date', endDateStr);

        if (findErr) throw findErr;

        const count = (toDelete || []).length;
        const monthNames = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        const monthName = monthNames[targetMonth - 1] || `Bulan ${targetMonth}`;

        if (count === 0) {
            return res.json({ 
                message: `Tidak ada agenda operasional yang ditemukan pada bulan ${monthName} ${targetYear}.`,
                deletedCount: 0 
            });
        }

        const idsToDelete = toDelete.map(e => e.id);
        const { error: delErr } = await supabase
            .from('calendar_events')
            .delete()
            .in('id', idsToDelete);

        if (delErr) throw delErr;

        // Log Admin Audit Trail
        await logAdminActivity({
            userId: req.userId,
            action: 'Pembersihan Agenda Bulanan',
            details: `Admin membersihkan seluruh agenda operasional untuk periode ${monthName} ${targetYear} (${count} agenda dihapus). Data cuti karyawan tetap aman.`,
            req
        });

        res.json({
            message: `Berhasil membersihkan ${count} agenda operasional pada ${monthName} ${targetYear}. Data cuti karyawan tetap utuh.`,
            deletedCount: count
        });
    } catch (err) {
        console.error('Clear month events error:', err);
        res.status(500).json({ error: err.message });
    }
};

