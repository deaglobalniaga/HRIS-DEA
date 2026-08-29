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
        if (!process.env.VAPID_PUBLIC_KEY || !Array.isArray(userIds) || userIds.length === 0) return;
        
        const { data: subs, error } = await supabase
            .from('push_subscriptions')
            .select('endpoint, keys')
            .in('user_id', userIds);

        if (error) {
            console.error('Error fetching push subscriptions:', error.message);
            return;
        }

        if (subs && subs.length > 0) {
            const payload = JSON.stringify({ 
                title: title || 'HRIS PT DEA GLOBAL NIAGA', 
                body: body || '',
                icon: '/dea.png',
                badge: '/dea.png'
            });
            for (const sub of subs) {
                if (sub && sub.endpoint && sub.keys) {
                    webpush.sendNotification(sub, payload).catch(err => {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint).then();
                        } else {
                            console.error('WebPush individual send error:', err.message);
                        }
                    });
                }
            }
        }
    } catch (err) {
        console.error('Failed to send web push:', err.message);
    }
};

// Helper: Create a notification for a user or target role
const createNotification = async ({ userId = null, targetRole = null, title, message, type = 'info', link = null }) => {
    try {
        if (userId) {
            await supabase.from('notifications').insert({
                user_id: userId,
                target_role: null,
                title,
                message,
                type,
                link,
                is_read: false
            });
            await sendWebPush([userId], title, message);
        } else if (targetRole) {
            await notifyRole(targetRole, title, message, type, link);
        }
    } catch (err) {
        console.error('Failed to create Supabase notification:', err.message);
    }
};

// Helper: Notify all admins/HR or Superadmin (Individual records per user for clean isolation)
const notifyRole = async (role, title, message, type = 'info', link = null) => {
    try {
        let userQuery = supabase.from('users').select('id, roles(name)').neq('is_active', false);
        if (role && role !== 'all') {
            const { data: roleData } = await supabase.from('roles').select('id').ilike('name', role).maybeSingle();
            if (roleData) {
                userQuery = userQuery.eq('role_id', roleData.id);
            }
        }
        const { data: users } = await userQuery;
        if (users && users.length > 0) {
            // Create a separate notification row for each user so delete/read actions are 100% private to each user
            const records = users.map(u => ({
                user_id: u.id,
                target_role: null,
                title,
                message,
                type,
                link,
                is_read: false
            }));
            await supabase.from('notifications').insert(records);
            await sendWebPush(users.map(u => u.id), title, message);
        } else {
            await supabase.from('notifications').insert({
                user_id: null,
                target_role: role || 'all',
                title,
                message,
                type,
                link,
                is_read: false
            });
        }
    } catch (err) {
        console.error(`Failed to notify role ${role}:`, err.message);
    }
};

// GET /api/notifications — Get notifications strictly for current user and their role broadcasts
exports.get_notifications = async (req, res) => {
    try {
        const userId = req.userId;
        const userRole = (req.userRole || req.role || 'user').toLowerCase();

        // 1. Auto cleanup notifications older than 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('notifications').delete().lt('created_at', thirtyDaysAgo);

        // 2. Determine which broadcast target_roles apply to this user
        const allowedRoles = ['all'];
        if (['superadmin', 'super_admin'].includes(userRole)) {
            allowedRoles.push('superadmin', 'super_admin', 'admin', 'hr', 'hrga_admin', 'hse_admin', 'hse');
        } else if (['hse_admin', 'hse'].includes(userRole)) {
            allowedRoles.push('hse_admin', 'hse', 'admin');
        } else if (['admin', 'hrga_admin', 'hr'].includes(userRole)) {
            allowedRoles.push('admin', 'hrga_admin', 'hr');
        } else {
            allowedRoles.push('user', 'karyawan', 'employee');
        }

        // Broadcast condition: user_id must be null AND target_role in allowed roles
        const roleFilters = allowedRoles.map(r => `and(user_id.is.null,target_role.ilike.${r})`).join(',');

        let query = supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (userId) {
            query = query.or(`user_id.eq.${userId},${roleFilters}`);
        } else {
            query = query.or(roleFilters);
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
        if (userId) {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId);
        }

        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/notifications/clear-all — Delete all user notifications
exports.delete_all = async (req, res) => {
    try {
        const userId = req.userId;
        if (userId) {
            await supabase
                .from('notifications')
                .delete()
                .eq('user_id', userId);
        }

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
