const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const controller = require('../controllers/reportController');

// GET monthly attendance report (all employees)
router.get('/reports/attendance-monthly', verifyToken, controller.get_attendance_monthly);

// GET personal attendance detail
router.get('/reports/attendance-personal', verifyToken, controller.get_attendance_personal);

// DELETE clear old data
router.delete('/reports/cleanup', verifyToken, controller.cleanup_old_data);

module.exports = router;
