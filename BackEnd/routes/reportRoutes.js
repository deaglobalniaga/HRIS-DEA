const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const controller = require('../controllers/reportController');

// GET monthly attendance report (all employees - ADMIN ONLY)
router.get('/reports/attendance-monthly', verifyToken, isAdmin, controller.get_attendance_monthly);

// GET personal attendance detail
router.get('/reports/attendance-personal', verifyToken, controller.get_attendance_personal);

// DELETE clear old data (ADMIN ONLY)
router.delete('/reports/cleanup', verifyToken, isAdmin, controller.cleanup_old_data);

module.exports = router;
