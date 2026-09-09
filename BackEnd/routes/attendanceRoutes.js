const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const controller = require('../controllers/attendanceController');

// POST Recognize Face from Camera (Public/Protected)
router.post('/attendance/recognize-face', verifyToken, controller.recognize_face);

// POST Clock In / Out (Records attendance without image)
router.post('/attendance/clock', verifyToken, controller.clock_in_out);

// GET Attendance Daily Status (Sudah Absen, Belum Absen, Tidak Hadir - ADMIN ONLY)
router.get('/attendance/daily-status', verifyToken, isAdmin, controller.get_daily_status);

// GET Attendance Today for Logged In User (Personal)
router.get('/attendance/my-today', verifyToken, controller.get_my_attendance_today);

// GET Attendance Today (All Employees - ADMIN ONLY)
router.get('/attendance/today', verifyToken, isAdmin, controller.get_attendance_today);

// GET Attendance History
router.get('/attendance/history', verifyToken, controller.get_attendance_history);

module.exports = router;
