const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const controller = require('../controllers/permissionController');

// GET Permissions (Permission/Sick)
router.get('/permissions', verifyToken, controller.get_permissions);

// POST Permission Request
router.post('/permissions', verifyToken, controller.post_permissions);

// PUT Update Permission Status
router.put('/permissions/:id/status', verifyToken, controller.put_permissions_id_status);


module.exports = router;
