const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/attendanceController');

// GET Attendance Today (Who is missing vs present)
router.get('/attendance/today', verifyToken, controller.get_attendance_today);

// POST Attendance
router.post('/attendance', verifyToken, controller.post_attendance);


module.exports = router;
