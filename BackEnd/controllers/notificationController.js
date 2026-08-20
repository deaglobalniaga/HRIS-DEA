const supabase = require('../config/supabase');
const webpush = require('web-push');
require('dotenv').config();

// Ensure VAPID is set if keys exist
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.CONTACT_EMAIL || 'mailto:admin@example.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

// Helper to send push
const sendWebPush = async (userIds, title, body) => {
    try {
        if (!process.env.VAPID_PUBLIC_KEY || userIds.length === 0) return;
        
        const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, keys').in('user_id', userIds);
        if (subs && subs.length > 0) {
            const payload = JSON.stringify({ title, body });
            for (const sub of subs) {
                webpush.sendNotification(sub, payload).catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint).then();
                    }
                });
            }
        }
    } catch (err) {
        console.error('Failed to send web push:', err.message);
    }
};

// Helper: Create a notification for a user or target role
const createNotification = async ({ userId = null, targetRole = null, title, message, type = 'info', link = null }) => {
    try {
        await supabase.from('notifications').insert({
            user_id: userId,
            target_role: targetRole,
            title,
            message,
            type,
            link
        });

        // Send Push
        if (userId) {
            await sendWebPush([userId], title, message);
        } else if (targetRole) {
            let userQuery = supabase.from('users').select('id').eq('status', 'active');
            if (targetRole !== 'all') {
                userQuery = userQuery.eq('role', targetRole);
            }
            const { data: users } = await userQuery;
            if (users && users.length > 0) {
                await sendWebPush(users.map(u => u.id), title, message);
            }
        }
    } catch (err) {
        console.error('Failed to create Supabase notification:', err.message);
    }
};

// Helper: Notify all admins/HR or Superadmin
const notifyRole = async (role, title, message, type = 'info', link = null) => {
    try {
        await supabase.from('notifications').insert({
            target_role: role,
            title,
            message,
            type,
            link
        });

        let userQuery = supabase.from('users').select('id').eq('status', 'active');
        if (role !== 'all') {
            userQuery = userQuery.eq('role', role);
        }
        const { data: users } = await userQuery;
        if (users && users.length > 0) {
            await sendWebPush(users.map(u => u.id), title, message);
        }
    } catch (err) {
        console.error(`Failed to notify role ${role}:`, err.message);
    }
};

// GET /api/notifications — Get notifications for current user and role
exports.get_notifications = async (req, res) => {
    try {
        const userId = req.userId;
        const userRole = (req.userRole || req.role || 'user').toLowerCase();

        // 1. Auto cleanup notifications older than 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('notifications').delete().lt('created_at', thirtyDaysAgo);

        // 2. Fetch notifications targeted to this user ID OR user's role OR all
        let query = supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (userId) {
            query = query.or(`user_id.eq.${userId},target_role.eq.${userRole},target_role.eq.all,target_role.is.null`);
        } else {
            query = query.or(`target_role.eq.${userRole},target_role.eq.all,target_role.is.null`);
        }

        const { data, error } = await query;
        if (error) throw error;

        const notifications = data || [];
        const unreadCount = notifications.filter(n => !n.is_read).length;

        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/notifications/:id/read — Mark single notification as read
exports.mark_read = async (req, res) => {
    try {
        const { id } = req.params;
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/notifications/read-all — Mark all notifications as read
exports.mark_all_read = async (req, res) => {
    try {
        const userId = req.userId;
        const userRole = (req.userRole || req.role || 'user').toLowerCase();

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .or(`user_id.eq.${userId},target_role.eq.${userRole},target_role.eq.all`);

        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/notifications/clear-all — Delete all user notifications
exports.delete_all = async (req, res) => {
    try {
        const userId = req.userId;
        await supabase
            .from('notifications')
            .delete()
            .eq('user_id', userId);

        res.json({ message: 'All notifications deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    ...exports,
    createNotification,
    notifyRole
};
