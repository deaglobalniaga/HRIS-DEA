const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const controller = require('../controllers/attendanceController');

// POST Recognize Face from Camera (Public/Protected)
router.post('/attendance/recognize-face', verifyToken, controller.recognize_face);

// POST Clock In / Out (Records attendance without image)
router.post('/attendance/clock', verifyToken, controller.clock_in_out);

// GET Attendance Daily Status (Sudah Absen, Belum Absen, Tidak Hadir)
router.get('/attendance/daily-status', verifyToken, controller.get_daily_status);

// GET Attendance Today
router.get('/attendance/today', verifyToken, controller.get_attendance_today);

// GET Attendance History
router.get('/attendance/history', verifyToken, controller.get_attendance_history);

module.exports = router;
