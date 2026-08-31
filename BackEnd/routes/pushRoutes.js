const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/subscribe', verifyToken, pushController.subscribe);
router.post('/unsubscribe', verifyToken, pushController.unsubscribe);
router.post('/test', verifyToken, pushController.testPush);

module.exports = router;
