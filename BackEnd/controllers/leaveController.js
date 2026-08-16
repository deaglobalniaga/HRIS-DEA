const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const { createNotification, notifyAdmins } = require('./notificationController');
const mailer = require('../utils/mailer');

exports.get_leave_status = async (req, res) => {
    try {
        const leaves = await LeaveRequest.find().populate('user', 'nama full_name role').sort({ start_date: 1 });
        
        const leaveData = {
            alreadyLeave: [],
            currentlyLeave: [],
            upcomingLeave: []
        };
        
        const now = new Date();
        
        leaves.forEach(leave => {
            if (!leave.user) return;
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            const name = leave.user.nama || leave.user.full_name || 'Unknown';
            const role = leave.user.role || 'Staff';
            const dateStr = `${start.getDate()} - ${end.getDate()} ${start.toLocaleString('default', { month: 'short' })} ${start.getFullYear()}`;
            
            const item = { id: leave._id, name, date: dateStr, role, type: leave.leave_type, reason: leave.reason, status: leave.status };
            
            if (end < now) {
                leaveData.alreadyLeave.push(item);
            } else if (start <= now && end >= now) {
                leaveData.currentlyLeave.push(item);
            } else {
                leaveData.upcomingLeave.push(item);
            }
        });
        
        if (leaves.length === 0) {
           return res.json({
               alreadyLeave: [],
               currentlyLeave: [],
               upcomingLeave: [],
               totalLeaveAllowed: 0,
               usedLeave: 0,
               remainingLeave: 0,
               wfhUsed: 0
           });
        }
        
        res.json(leaveData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.post_leaves = async (req, res) => {
    try {
        const { leave_start, leave_end, reason, proof_url, proof_base64, type } = req.body;
        
        let final_proof_url = proof_url;
        if (proof_base64) {
            final_proof_url = proof_base64;
        }

        const leave = await LeaveRequest.create({
            user: req.userId,
            start_date: leave_start,
            end_date: leave_end,
            leave_type: type || 'Cuti',
            reason: reason,
            attachment_url: final_proof_url,
            status: 'Pending'
        });

        const user = await User.findById(req.userId).select('nama full_name');
        const userName = user?.nama || user?.full_name || 'Karyawan';

        await notifyAdmins(
            'Pengajuan Cuti Baru',
            `${userName} mengajukan cuti: ${leave_start} s/d ${leave_end}. Alasan: ${reason || '-'}`,
            'leave',
            '/permissions'
        );

        await mailer.sendRequestNotification(
            process.env.HR_EMAIL || 'hr@deaglobalniaga.com',
            `Pengajuan Baru: Cuti - ${userName}`,
            {
                type: 'Cuti',
                name: userName,
                dateRange: `${leave_start} s/d ${leave_end}`,
                reason: reason || '-'
            },
            'http://localhost:5173/permissions'
        );

        res.status(201).json({ message: 'Leave request submitted successfully', data: leave });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /leaves/:id/approve — Approve or Reject a leave
exports.put_leave_status = async (req, res) => {
    try {
        const role = (req.userRole || '').toLowerCase();
        if (!role.includes('admin') && !role.includes('hr') && role !== 'superadmin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const { status } = req.body; // 'Approved' or 'Rejected'

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const leave = await LeaveRequest.findById(id);
        if (!leave) throw new Error('Leave not found');

        leave.status = status;
        await leave.save();

        const statusText = status === 'Approved' ? 'disetujui ✅' : 'ditolak ❌';
        await createNotification(
            leave.user,
            `Cuti ${statusText}`,
            `Pengajuan cuti Anda telah ${statusText}.`,
            status === 'Approved' ? 'success' : 'warning',
            '/permissions'
        );

        res.json({ message: `Leave ${status.toLowerCase()} successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
