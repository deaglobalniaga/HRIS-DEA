const supabase = require('../config/supabase');
const { notifyRole } = require('./notificationController');

// GET /api/hris/leaves / get_leave_status
// Pure log recorder & monitoring calendar — no approval workflow
exports.get_leave_status = async (req, res) => {
    try {
        const { data: leaves, error } = await supabase
            .from('leaves')
            .select(`
                *,
                employees (
                    id,
                    nama_lengkap,
                    nomor_pegawai,
                    jabatan,
                    departments (name)
                )
            `)
            .order('start_date', { ascending: true });

        if (error) throw error;

        const now = new Date();
        const nowStr = now.toISOString().split('T')[0];

        const leaveData = {
            alreadyLeave: [],
            currentlyLeave: [],
            upcomingLeave: [],
            allLeaves: leaves || []
        };

        (leaves || []).forEach(l => {
            const empName = l.employees?.nama_lengkap || 'Karyawan';
            const deptName = l.employees?.departments?.name || 'General';
            const startDate = l.start_date;
            const endDate = l.end_date;

            const item = {
                id: l.id,
                employee_id: l.employee_id,
                name: empName,
                department: deptName,
                role: l.employees?.jabatan || 'Staff',
                type: l.leave_type || 'Cuti Roster',
                start_date: startDate,
                end_date: endDate,
                date: `${startDate} s/d ${endDate}`,
                duration_days: l.duration_days || 14,
                notes: l.notes || '',
                document_url: l.document_url || null
            };

            if (endDate < nowStr) {
                leaveData.alreadyLeave.push(item);
            } else if (startDate <= nowStr && endDate >= nowStr) {
                leaveData.currentlyLeave.push(item);
            } else {
                leaveData.upcomingLeave.push(item);
            }
        });

        res.json(leaveData);
    } catch (err) {
        console.error('Get leaves error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/hris/leaves
// (Admin Only) Record leave period (e.g. 2-week leave/roster block)
exports.post_leaves = async (req, res) => {
    try {
        const { employee_id, leave_type, start_date, end_date, duration_days, notes } = req.body;

        if (!employee_id || !start_date || !end_date) {
            return res.status(400).json({ message: 'Employee ID, start date, and end date are required' });
        }

        let documentUrl = null;
        if (req.file) {
            documentUrl = `/uploads/documents/${req.file.filename}`;
        }

        // Calculate days if not provided
        let calcDays = duration_days;
        if (!calcDays && start_date && end_date) {
            const d1 = new Date(start_date);
            const d2 = new Date(end_date);
            calcDays = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
        }

        const { data, error } = await supabase
            .from('leaves')
            .insert({
                employee_id,
                leave_type: leave_type || 'Cuti Roster (2 Minggu)',
                start_date,
                end_date,
                duration_days: calcDays || 14,
                notes: notes || 'Pencatatan Cuti Roster',
                document_url: documentUrl
            })
            .select('*')
            .single();

        if (error) throw error;

        // Fetch user info for notification
        const { data: empData } = await supabase.from('employees').select('nama_lengkap').eq('id', employee_id).single();
        const empName = empData?.nama_lengkap || 'Karyawan';

        await notifyRole('hr', 'Pengajuan Cuti', `${empName} telah mengajukan ${leave_type || 'cuti'}. Silakan periksa.`);

        res.status(201).json({
            message: 'Pencatatan cuti/roster karyawan berhasil disimpan ke kalender',
            data
        });
    } catch (err) {
        console.error('Post leaves error:', err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/hris/leaves/:id
exports.delete_leave = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('leaves').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Data cuti berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
