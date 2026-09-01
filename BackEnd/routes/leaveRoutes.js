const express = require('express');
const router = express.Router();
const { verifyToken, canManageLeaves } = require('../middlewares/authMiddleware');
const controller = require('../controllers/leaveController');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET Leaves for Calendar Monitoring
router.get('/leave-status', verifyToken, controller.get_leave_status);
router.get('/leaves', verifyToken, controller.get_leave_status);

// POST Record Leave Block (HRGA & Superadmin Only - HSE forbidden)
router.post('/leaves', verifyToken, canManageLeaves, upload.single('document'), controller.post_leaves);

// DELETE Leave Record (HRGA & Superadmin Only - HSE forbidden)
router.delete('/leaves/:id', verifyToken, canManageLeaves, controller.delete_leave);

module.exports = router;
