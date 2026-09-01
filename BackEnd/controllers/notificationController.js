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

// Helper: Notify specific role or department (Only users that actually belong to that role/department)
const notifyRole = async (targetGroup, title, message, type = 'info', link = null) => {
    try {
        const group = (targetGroup || 'all').toLowerCase();
        
        if (group === 'all') {
            // General broadcast to all users
            await supabase.from('notifications').insert({
                user_id: null,
                target_role: 'all',
                title,
                message,
                type,
                link,
                is_read: false
            });
            return;
        }

        // Fetch all active users with their role and department
        const { data: usersWithDept, error } = await supabase
            .from('users')
            .select(`
                id,
                username,
                roles (name),
                employees (
                    department_id,
                    departments (name)
                )
            `)
            .neq('is_active', false);

        if (error) {
            console.error('Error fetching users for notifyRole:', error);
            return;
        }

        // Filter target recipients based on targetGroup
        const targetUsers = (usersWithDept || []).filter(u => {
            const roleName = (u.roles?.name || '').toLowerCase();
            const emp = Array.isArray(u.employees) ? u.employees[0] : u.employees;
            const deptName = (emp?.departments?.name || '').toLowerCase();
            const username = (u.username || '').toLowerCase();

            const isSuperAdmin = roleName === 'superadmin' || username === 'arya_admin';
            const isHR = (roleName === 'admin' && (deptName.includes('hr') || deptName.includes('hrga') || username === 'admin')) || isSuperAdmin;
            const isHSE = (roleName === 'admin' && (deptName.includes('hse') || deptName.includes('k3') || deptName.includes('safety') || username === 'hse_admin')) || isSuperAdmin;

            if (group === 'hr' || group === 'hrga' || group === 'hrga_admin') {
                return isHR;
            }
            if (group === 'hse' || group === 'hse_admin') {
                return isHSE;
            }
            if (group === 'superadmin' || group === 'super_admin') {
                return isSuperAdmin;
            }
            if (group === 'admin') {
                return roleName === 'admin' || isSuperAdmin;
            }
            return false;
        });

        if (targetUsers.length > 0) {
            const records = targetUsers.map(u => ({
                user_id: u.id,
                target_role: null,
                title,
                message,
                type,
                link,
                is_read: false
            }));
            await supabase.from('notifications').insert(records);
            await sendWebPush(targetUsers.map(u => u.id), title, message);
        }
    } catch (err) {
        console.error(`Failed to notify role ${targetGroup}:`, err.message);
    }
};

// GET /api/notifications — Get notifications strictly for current user and their role broadcasts
exports.get_notifications = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.json({ notifications: [], unreadCount: 0 });
        }

        // 1. Auto cleanup notifications older than 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('notifications').delete().lt('created_at', thirtyDaysAgo);

        // 2. Fetch current user's profile to know exact role, department, and full name
        const { data: userProfile } = await supabase
            .from('users')
            .select(`
                id,
                username,
                roles (name),
                employees (
                    nama_lengkap,
                    departments (name)
                )
            `)
            .eq('id', userId)
            .maybeSingle();

        const roleName = (userProfile?.roles?.name || req.userRole || 'user').toLowerCase();
        const emp = Array.isArray(userProfile?.employees) ? userProfile.employees[0] : userProfile?.employees;
        const deptName = (emp?.departments?.name || '').toLowerCase();
        const username = (userProfile?.username || '').toLowerCase();
        const myFullName = (emp?.nama_lengkap || '').toLowerCase();

        const isSuperAdmin = roleName === 'superadmin' || username === 'arya_admin';
        const isHSE = username === 'hse_admin' || deptName.includes('hse') || deptName.includes('k3') || deptName.includes('safety') || deptName.includes('pengelola k3');
        const isHR = (roleName === 'admin' && (deptName.includes('hr') || deptName.includes('hrga') || username === 'admin')) || isSuperAdmin;

        // 3. Determine which broadcast target_roles apply to this user
        const allowedTargetRoles = ['all'];
        if (isSuperAdmin) {
            allowedTargetRoles.push('superadmin', 'admin', 'hr', 'hrga', 'hse', 'hse_admin');
        } else if (isHSE) {
            allowedTargetRoles.push('hse', 'hse_admin');
        } else if (isHR) {
            allowedTargetRoles.push('hr', 'hrga', 'hrga_admin', 'admin');
        } else {
            allowedTargetRoles.push('user', 'karyawan', 'employee');
        }

        const roleFilters = allowedTargetRoles.map(r => `and(user_id.is.null,target_role.ilike.${r})`).join(',');
        
        let query = supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(60);

        query = query.or(`user_id.eq.${userId},${roleFilters}`);

        const { data, error } = await query;
        if (error) throw error;

        let notifications = data || [];

        // Strict Role Information Boundary Filtering:
        notifications = notifications.filter(n => {
            const title = (n.title || '').toLowerCase();
            const msg = (n.message || '').toLowerCase();
            const isLeaveRelated = title.includes('cuti') || title.includes('izin') || title.includes('roster') || msg.includes('cuti') || msg.includes('roster') || msg.includes('libur 13/1');

            // 1. HSE Boundary: HSE role must NEVER see other employees' leave/cuti requests
            if (isHSE && !isSuperAdmin) {
                if (isLeaveRelated) {
                    // Only show if it's about the HSE user's own leave
                    const isOwnLeave = (myFullName && msg.includes(myFullName)) || (username && msg.includes(username));
                    return isOwnLeave;
                }
            }

            // 2. HRGA Boundary: HRGA should not receive HSE-only certification verification requests
            if (isHR && !isSuperAdmin && !isHSE) {
                if (title === 'pengajuan sertifikasi' && n.target_role === 'hse_admin') {
                    return false;
                }
            }

            // 3. Regular Employee Boundary: Regular employees can only see their own personal notifications or 'all' broadcasts
            if (!isHR && !isHSE && !isSuperAdmin) {
                if (n.target_role && n.target_role !== 'all') {
                    return false;
                }
                // If it's a leave notification, ensure it's about themselves
                if (isLeaveRelated) {
                    const isOwnLeave = (myFullName && msg.includes(myFullName)) || (username && msg.includes(username)) || n.user_id === userId;
                    return isOwnLeave;
                }
            }

            return true;
        });

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
