const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/dashboardController');

// GET Dashboard Stats (Admin HR)
router.get('/dashboard-stats', verifyToken, controller.get_dashboard_stats);

// GET Employee Personal Dashboard
router.get('/employee-dashboard', verifyToken, controller.get_employee_dashboard);

// POST Manual System Note
router.post('/system-notes', verifyToken, controller.post_system_notes);

// DELETE Manual System Note
router.delete('/system-notes/:id', verifyToken, controller.delete_system_notes_id);

module.exports = router;
