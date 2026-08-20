const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const controller = require('../controllers/dashboardController');

// GET Dashboard Stats (Admin HR / Superadmin)
router.get('/dashboard-stats', verifyToken, controller.get_dashboard_stats);

// GET Employee Dashboard
router.get('/employee-dashboard', verifyToken, controller.get_employee_dashboard);

// System Notes
router.post('/dashboard/system-notes', verifyToken, controller.post_system_notes);
router.delete('/dashboard/system-notes/:id', verifyToken, controller.delete_system_notes_id);

module.exports = router;
