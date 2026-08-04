const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/analyticsController');

// GET Attendance Trend (3-6 months)
router.get('/analytics/trend', verifyToken, controller.get_trend);

// GET Attendance Heatmap
router.get('/analytics/heatmap', verifyToken, controller.get_heatmap);

// GET Division Stats (Radar Chart)
router.get('/analytics/division-stats', verifyToken, controller.get_division_stats);

module.exports = router;
