const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const controller = require('../controllers/calendarController');

router.get('/calendar/events', verifyToken, controller.get_calendar_events);
router.post('/calendar/events', verifyToken, isAdmin, controller.post_event);
router.post('/calendar/events/clear-month', verifyToken, isAdmin, controller.clear_month_events);
router.delete('/calendar/events/clear-month', verifyToken, isAdmin, controller.clear_month_events);
router.put('/calendar/events/:id', verifyToken, isAdmin, controller.put_event);
router.delete('/calendar/events/:id', verifyToken, isAdmin, controller.delete_event);

module.exports = router;

