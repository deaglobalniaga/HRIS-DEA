const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const { createNotification, notifyAdmins } = require('./notificationController');
const mailer = require('../utils/mailer');

exports.get_permissions = async (req, res) => {
    try {
        let query = LeaveRequest.find({ leave_type: { $in: ['Izin', 'Sakit', 'Permission', 'Sick'] } })
            .populate('user', 'full_name nama role')
            .sort({ createdAt: -1 });

        const adminRoles = ['admin', 'hr', 'superadmin'];
        if (!adminRoles.includes((req.userRole || '').toLowerCase())) {
            query = query.where('user').equals(req.userId);
        }

        const data = await query.exec();
        
        const permissionsData = data.map(item => {
            const d = new Date(item.start_date);
            return {
                id: item._id.toString(),
                type: item.leave_type,
                date: `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`,
                reason: item.reason,
                status: item.status,
                name: item.user ? (item.user.nama || item.user.full_name) : 'Unknown',
                role: item.user ? item.user.role : 'Staff',
                proof_url: item.attachment_url
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

        const data = await LeaveRequest.create({
            user: req.userId,
            leave_type: type,
            start_date: date,
            end_date: date, // For single day permissions
            reason: reason,
            attachment_url: proof_base64 || null,
            status: 'Pending'
        });

        // Notify admins via system notification
        const user = await User.findById(req.userId).select('nama full_name');
        const userName = user ? (user.nama || user.full_name) : 'Karyawan';
        
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

        const leave = await LeaveRequest.findById(req.params.id);
        if (!leave) throw new Error("Permission not found");
        
        leave.status = status;
        await leave.save();

        // Notify the employee
        let statusText = 'diproses';
        if (status === 'Approved_Atasan') statusText = 'disetujui Atasan (menunggu HR) ⏳';
        else if (status === 'Approved') statusText = 'disetujui sepenuhnya ✅';
        else if (status === 'Rejected') statusText = 'ditolak ❌';

        await createNotification(
            leave.user,
            `Update Izin: ${statusText}`,
            `Pengajuan izin ${leave.leave_type} telah ${statusText}.`,
            status === 'Approved' ? 'success' : status === 'Rejected' ? 'warning' : 'info',
            '/attendance-hub'
        );

        res.json({ message: `Permission ${status.toLowerCase()} successfully`, data: leave });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
