const supabase = require('../config/supabaseClient');
const { createNotification, notifyAdmins } = require('./notificationController');
const mailer = require('../utils/mailer');

exports.get_permissions = async (req, res) => {
    try {
        let query = supabase
            .from('permissions')
            .select('*, users(full_name, role)')
            .order('created_at', { ascending: false });

        const adminRoles = ['admin', 'hr'];
        if (!adminRoles.includes((req.userRole || '').toLowerCase())) {
            query = query.eq('user_id', req.userId);
        }

        const { data, error } = await query;

        if (error && error.code !== '42P01') throw error;
        
        const permissionsData = (data || []).map(item => {
            const d = new Date(item.date);
            return {
                id: item.id,
                type: item.type,
                date: `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`,
                reason: item.reason,
                status: item.status,
                name: item.users?.full_name || 'Unknown',
                role: item.users?.role || 'Staff',
                proof_url: item.proof_url
            };
        });

        res.json(permissionsData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.post_permissions = async (req, res) => {
    try {
        const { type, date, reason, proof_base64 } = req.body;
        
        if (!date) {
            return res.status(400).json({ error: "Tanggal pengajuan wajib diisi" });
        }

        let proof_url = null;
        if (proof_base64) {
            proof_url = proof_base64;
        }

        const { data, error } = await supabase
            .from('permissions')
            .insert([{
                user_id: req.userId,
                type,
                date,
                reason,
                proof_url,
                status: 'Pending'
            }]);

        if (error) throw error;

        // Notify admins via system notification
        const { data: userData } = await supabase.from('users').select('full_name').eq('id', req.userId).single();
        const userName = userData?.full_name || 'Karyawan';
        await notifyAdmins(
            'Pengajuan Izin Baru',
            `${userName} mengajukan izin ${type} mulai ${date}. Alasan: ${reason || '-'}`,
            'permission',
            '/permissions'
        );

        // Send Email Notification
        await mailer.sendRequestNotification(
            process.env.HR_EMAIL || 'hr@deaglobalniaga.com',
            `Pengajuan Baru: ${type} - ${userName}`,
            {
                type: type,
                name: userName,
                date: date,
                reason: reason || '-'
            },
            'http://localhost:5173/permissions'
        );

        res.status(201).json({ message: 'Permission requested successfully', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.put_permissions_id_status = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Approved_Atasan', 'Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Get permission data for notification
        const { data: perm, error: permErr } = await supabase
            .from('permissions')
            .select('user_id, type, date')
            .eq('id', req.params.id)
            .single();
        if (permErr) throw permErr;
        
        const { data, error } = await supabase
            .from('permissions')
            .update({ status })
            .eq('id', req.params.id);

        if (error) throw error;

        // Notify the employee
        let statusText = 'diproses';
        if (status === 'Approved_Atasan') statusText = 'disetujui Atasan (menunggu HR) ⏳';
        else if (status === 'Approved') statusText = 'disetujui sepenuhnya ✅';
        else if (status === 'Rejected') statusText = 'ditolak ❌';

        await createNotification(
            perm.user_id,
            `Update Izin: ${statusText}`,
            `Pengajuan izin ${perm.type} (${perm.date}) telah ${statusText}.`,
            status === 'Approved' ? 'success' : status === 'Rejected' ? 'warning' : 'info',
            '/attendance-hub'
        );

        res.json({ message: `Permission ${status.toLowerCase()} successfully`, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
