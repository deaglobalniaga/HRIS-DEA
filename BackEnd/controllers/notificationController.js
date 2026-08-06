const supabase = require('../config/supabaseClient');

// Helper: Create a notification
const createNotification = async (userId, title, message, type = 'info', link = null) => {
    try {
        await supabase.from('notifications').insert([{
            user_id: userId,
            title,
            message,
            type,
            link
        }]);
    } catch (err) {
        console.error('Failed to create notification:', err.message);
    }
};

// Helper: Notify all admins/HR
const notifyAdmins = async (title, message, type = 'info', link = null) => {
    try {
        const { data: admins } = await supabase
            .from('users')
            .select('id, role')
            .or('role.ilike.%admin%,role.ilike.%hr%');

        if (admins && admins.length > 0) {
            const notifications = admins.map(a => ({
                user_id: a.id,
                title,
                message,
                type,
                link
            }));
            await supabase.from('notifications').insert(notifications);
        }
    } catch (err) {
        console.error('Failed to notify admins:', err.message);
    }
};

// GET /notifications — Get user's notifications
exports.get_notifications = async (req, res) => {
    try {
        const userId = req.userId;
        
        // Auto cleanup notifications older than 30 days
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        await supabase
            .from('notifications')
            .delete()
            .lt('created_at', oneMonthAgo.toISOString());

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        
        // Count unread
        const unreadCount = (data || []).filter(n => !n.is_read).length;
        
        res.json({ notifications: data || [], unreadCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /notifications/:id/read — Mark single notification as read
exports.mark_read = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('user_id', req.userId);

        if (error) throw error;
        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /notifications/read-all — Mark all notifications as read
exports.mark_all_read = async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', req.userId)
            .eq('is_read', false);

        if (error) throw error;
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /notifications/clear-all — Delete all user notifications
exports.delete_all = async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', req.userId);

        if (error) throw error;
        res.json({ message: 'All notifications deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Export helpers for use in other controllers
exports.createNotification = createNotification;
exports.notifyAdmins = notifyAdmins;
