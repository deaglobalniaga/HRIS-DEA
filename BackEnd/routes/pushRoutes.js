const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/subscribe', verifyToken, pushController.subscribe);
router.post('/unsubscribe', verifyToken, pushController.unsubscribe);

module.exports = router;
