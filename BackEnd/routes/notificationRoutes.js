const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const controller = require('../controllers/notificationController');

// GET all notifications for current user
router.get('/notifications', verifyToken, controller.get_notifications);

// PUT mark single notification as read
router.put('/notifications/:id/read', verifyToken, controller.mark_read);

// PUT mark all notifications as read
router.put('/notifications/read-all', verifyToken, controller.mark_all_read);

// DELETE all user notifications
router.delete('/notifications/clear-all', verifyToken, controller.delete_all);

module.exports = router;
