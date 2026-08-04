const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/calendarController');

router.get('/calendar/events', verifyToken, controller.get_calendar_events);
router.post('/calendar/events', verifyToken, controller.post_event);
router.delete('/calendar/events/:id', verifyToken, controller.delete_event);

module.exports = router;
