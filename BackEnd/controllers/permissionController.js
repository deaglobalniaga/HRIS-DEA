const supabase = require('../config/supabase');
const { notifyRole, createNotification } = require('./notificationController');

exports.get_permissions = async (req, res) => {
    try {
        let query = supabase
            .from('leaves')
            .select(`
                id,
                leave_type,
                start_date,
                end_date,
                reason,
                status,
                attachment_url,
                created_at,
                employees (id, nama_lengkap, jabatan, user_id)
            `)
            .in('leave_type', ['Izin', 'Sakit', 'Permission', 'Sick'])
            .order('created_at', { ascending: false });

        const adminRoles = ['admin', 'hr', 'hrga_admin', 'superadmin'];
        if (!adminRoles.includes((req.userRole || '').toLowerCase())) {
            // Filter by user's employee ID
            const { data: emp } = await supabase.from('employees').select('id').eq('user_id', req.userId).single();
            if (emp) {
                query = query.eq('employee_id', emp.id);
            }
        }

        const { data, error } = await query;
        if (error) throw error;

        const permissionsData = (data || []).map(item => {
            const d = new Date(item.start_date || item.created_at);
            return {
                id: item.id,
                type: item.leave_type,
                date: `${d.getDate()} ${d.toLocaleString('id-ID', { month: 'short' })} ${d.getFullYear()}`,
                reason: item.reason,
                status: item.status,
                name: item.employees?.nama_lengkap || 'Karyawan',
                role: item.employees?.jabatan || 'Staff',
                proof_url: item.attachment_url
            };
        });

        res.json(permissionsData);
    } catch (err) {
        console.error('get_permissions error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.post_permissions = async (req, res) => {
    try {
        const { type, date, reason, proof_base64 } = req.body;
        
        if (!date) {
            return res.status(400).json({ error: "Tanggal pengajuan wajib diisi" });
        }

        const { data: emp } = await supabase.from('employees').select('id, nama_lengkap').eq('user_id', req.userId).single();
        if (!emp) return res.status(400).json({ error: "Data profil karyawan tidak ditemukan" });

        const { data, error } = await supabase
            .from('leaves')
            .insert({
                employee_id: emp.id,
                leave_type: type || 'Izin',
                start_date: date,
                end_date: date,
                reason: reason || '',
                attachment_url: proof_base64 || null,
                status: 'Pending'
            })
            .select('*')
            .single();

        if (error) throw error;

        await notifyRole('hr', 'Pengajuan Izin', `${emp.nama_lengkap} mengajukan ${type || 'Izin'}.`, 'leave_request', '/attendance-hub');

        res.status(201).json({ message: 'Pengajuan izin berhasil dibuat', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.put_permissions_id_status = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Approved_Atasan', 'Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status tidak valid' });
        }

        const { data, error } = await supabase
            .from('leaves')
            .update({ status })
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error) throw error;

        const { data: empData } = await supabase.from('employees').select('user_id').eq('id', data.employee_id).single();
        if (empData && empData.user_id) {
            await createNotification({
                userId: empData.user_id,
                title: 'Status Pengajuan Izin',
                message: `Pengajuan ${data.leave_type} Anda telah diubah statusnya menjadi ${status}.`,
                type: status === 'Rejected' ? 'leave_rejected' : 'leave_approved',
                link: '/attendance-hub'
            });
        }

        res.json({ message: `Status izin berhasil diubah menjadi ${status}`, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
