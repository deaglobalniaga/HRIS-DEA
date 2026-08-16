const User = require('../models/User');
const Notification = require('../models/Notification');

// Helper: Create a notification
const createNotification = async (userId, title, message, type = 'info', link = null) => {
    try {
        await Notification.create({
            user: userId,
            title,
            message,
            type,
            link
        });
    } catch (err) {
        console.error('Failed to create notification:', err.message);
    }
};

// Helper: Notify all admins/HR
const notifyAdmins = async (title, message, type = 'info', link = null) => {
    try {
        const admins = await User.find({
            role: { $in: ['admin', 'hr', 'superadmin'] }
        });

        if (admins && admins.length > 0) {
            const notifications = admins.map(a => ({
                user: a._id,
                title,
                message,
                type,
                link
            }));
            await Notification.insertMany(notifications);
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
        await Notification.deleteMany({
            createdAt: { $lt: oneMonthAgo }
        });

        const data = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(50);

        // Count unread
        const unreadCount = data.filter(n => !n.is_read).length;
        
        res.json({ notifications: data, unreadCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /notifications/:id/read — Mark single notification as read
exports.mark_read = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findOneAndUpdate(
            { _id: id, user: req.userId },
            { is_read: true }
        );
        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /notifications/read-all — Mark all notifications as read
exports.mark_all_read = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.userId, is_read: false },
            { is_read: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /notifications/clear-all — Delete all user notifications
exports.delete_all = async (req, res) => {
    try {
        await Notification.deleteMany({ user: req.userId });
        res.json({ message: 'All notifications deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Export helpers for use in other controllers
exports.createNotification = createNotification;
exports.notifyAdmins = notifyAdmins;
