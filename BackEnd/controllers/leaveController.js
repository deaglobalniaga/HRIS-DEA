const supabase = require('../config/supabaseClient');
const { createNotification, notifyAdmins } = require('./notificationController');
const mailer = require('../utils/mailer');
exports.get_leave_status = async (req, res) => {
    try {
        // Query actual leaves from Supabase
        const { data, error } = await supabase
            .from('leaves')
            .select('*, users(full_name, role)')
            .order('leave_start', { ascending: true });

        if (error) throw error;
        
        // Map to expected format
        const leaveData = {
            alreadyLeave: [],
            currentlyLeave: [],
            upcomingLeave: []
        };
        
        const now = new Date();
        
        data.forEach(leave => {
            const start = new Date(leave.leave_start);
            const end = new Date(leave.leave_end);
            const name = leave.users?.full_name || 'Unknown';
            const role = leave.users?.role || 'Staff';
            const dateStr = `${start.getDate()} - ${end.getDate()} ${start.toLocaleString('default', { month: 'short' })} ${start.getFullYear()}`;
            
            const item = { name, date: dateStr, role };
            
            if (end < now) {
                leaveData.alreadyLeave.push(item);
            } else if (start <= now && end >= now) {
                leaveData.currentlyLeave.push(item);
            } else {
                leaveData.upcomingLeave.push(item);
            }
        });
        
        // Return empty structure if no data
        if (data.length === 0) {
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
        const { leave_start, leave_end, reason, proof_url, proof_base64 } = req.body;
        
        let final_proof_url = proof_url;
        if (proof_base64) {
            final_proof_url = proof_base64;
        }

        const { data, error } = await supabase
            .from('leaves')
            .insert([{
                user_id: req.userId,
                leave_start,
                leave_end,
                reason,
                proof_url: final_proof_url,
                status: 'Pending'
            }]);

        if (error) throw error;

        // Get user name for notification
        const { data: userData } = await supabase.from('users').select('full_name').eq('id', req.userId).single();
        const userName = userData?.full_name || 'Karyawan';

        // Notify all admins/HR about new leave request via system
        await notifyAdmins(
            'Pengajuan Cuti Baru',
            `${userName} mengajukan cuti: ${leave_start} s/d ${leave_end}. Alasan: ${reason || '-'}`,
            'leave',
            '/permissions'
        );

        // Send Email Notification via SMTP
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

        res.status(201).json({ message: 'Leave request submitted successfully', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /leaves/:id/approve — Approve or Reject a leave
exports.put_leave_status = async (req, res) => {
    try {
        const role = (req.userRole || '').toLowerCase();
        if (!role.includes('admin') && !role.includes('hr')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const { status } = req.body; // 'Approved' or 'Rejected'

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Get leave data to find the user
        const { data: leave, error: leaveErr } = await supabase
            .from('leaves')
            .select('user_id, leave_start, leave_end')
            .eq('id', id)
            .single();

        if (leaveErr) throw leaveErr;

        const { error } = await supabase
            .from('leaves')
            .update({ status })
            .eq('id', id);

        if (error) throw error;

        // Notify the employee
        const statusText = status === 'Approved' ? 'disetujui ✅' : 'ditolak ❌';
        await createNotification(
            leave.user_id,
            `Cuti ${statusText}`,
            `Pengajuan cuti Anda (${leave.leave_start} s/d ${leave.leave_end}) telah ${statusText}.`,
            status === 'Approved' ? 'success' : 'warning',
            '/permissions'
        );

        res.json({ message: `Leave ${status.toLowerCase()} successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
