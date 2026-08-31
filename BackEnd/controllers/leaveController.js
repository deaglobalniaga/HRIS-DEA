const supabase = require('../config/supabase');
const { notifyRole } = require('./notificationController');
const { uploadToSupabaseStorage } = require('../utils/storage');
const { getWitaDateStr } = require('../utils/dateTime');

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

        const nowStr = getWitaDateStr();

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
// (Admin Only) Record leave period (e.g. 2-week leave/roster block, 13/1 off day, etc.)
exports.post_leaves = async (req, res) => {
    try {
        const { employee_id, leave_type, start_date, end_date, duration_days, notes } = req.body;

        if (!employee_id || !start_date || !end_date) {
            return res.status(400).json({ message: 'Pilih karyawan, tanggal mulai, dan tanggal selesai secara lengkap.' });
        }

        let documentUrl = null;
        if (req.file) {
            documentUrl = await uploadToSupabaseStorage(req.file, 'documents');
        }

        // Calculate days if not provided
        let calcDays = duration_days ? parseInt(duration_days) : null;
        if (!calcDays && start_date && end_date) {
            const d1 = new Date(start_date);
            const d2 = new Date(end_date);
            calcDays = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
        }

        const normalizedLeaveType = leave_type || 'Cuti Roster (2 Minggu)';

        const { data, error } = await supabase
            .from('leaves')
            .insert({
                employee_id,
                leave_type: normalizedLeaveType,
                start_date,
                end_date,
                duration_days: calcDays || (normalizedLeaveType.includes('13/1') ? 1 : 14),
                notes: notes || 'Pencatatan Kehadiran / Cuti',
                document_url: documentUrl
            })
            .select('*')
            .single();

        if (error) {
            console.error('Supabase insert leave error:', error);
            return res.status(500).json({ message: error.message || 'Gagal menyimpan data cuti ke database.' });
        }

        // Fetch user info for notification safely
        try {
            const { data: empData } = await supabase.from('employees').select('nama_lengkap').eq('id', employee_id).single();
            const empName = empData?.nama_lengkap || 'Karyawan';
            await notifyRole('hr', 'Pencatatan Cuti / Roster', `${empName} telah dicatat ${normalizedLeaveType} (${start_date} s/d ${end_date}).`, 'leave_request', '/calendar');
        } catch (notifErr) {
            console.warn('Notify leave error (non-fatal):', notifErr.message);
        }

        res.status(201).json({
            message: 'Pencatatan cuti/roster karyawan berhasil disimpan ke kalender operasional',
            data
        });
    } catch (err) {
        console.error('Post leaves error:', err);
        res.status(500).json({ message: err.message || 'Gagal menyimpan data cuti.' });
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
