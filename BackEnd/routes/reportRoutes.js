const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/reportController');

// GET monthly attendance report (all employees)
router.get('/reports/attendance-monthly', verifyToken, controller.get_attendance_monthly);

// GET personal attendance detail
router.get('/reports/attendance-personal', verifyToken, controller.get_attendance_personal);

// GET raw attendance logs with photos
router.get('/reports/attendance-log', verifyToken, controller.get_attendance_log);

module.exports = router;
