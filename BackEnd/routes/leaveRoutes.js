const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/leaveController');

// GET Leave Status
router.get('/leave-status', verifyToken, controller.get_leave_status);

// POST Leave Request
router.post('/leaves', verifyToken, controller.post_leaves);

// PUT Approve/Reject Leave
router.put('/leaves/:id/status', verifyToken, controller.put_leave_status);


module.exports = router;
