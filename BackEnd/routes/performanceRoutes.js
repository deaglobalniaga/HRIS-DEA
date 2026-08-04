const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/performanceController');

// GET Performance Reviews
router.get('/performance', verifyToken, controller.get_performance);

// GET Roster & Attendance Stats
router.get('/performance/roster-stats', verifyToken, controller.get_roster_stats);

// POST New Performance KPI
router.post('/performance', verifyToken, controller.post_performance);
// PUT Update Performance KPI
router.put('/performance/:id', verifyToken, controller.put_performance_id);

// DELETE Performance KPI
router.delete('/performance/:id', verifyToken, controller.delete_performance_id);

// PUT Update User Roster Type (6/2 or 8/2)
router.put('/performance/roster/:id', verifyToken, controller.put_user_roster);

module.exports = router;
