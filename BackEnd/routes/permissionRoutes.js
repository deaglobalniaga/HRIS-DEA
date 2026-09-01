const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, canManageLeaves } = require('../middlewares/authMiddleware');
const controller = require('../controllers/permissionController');

// GET Permissions (Permission/Sick)
router.get('/permissions', verifyToken, controller.get_permissions);

// POST Permission Request (User self request)
router.post('/permissions', verifyToken, controller.post_permissions);

// PUT Update Permission Status (HRGA & Superadmin Only - HSE forbidden)
router.put('/permissions/:id/status', verifyToken, canManageLeaves, controller.put_permissions_id_status);


module.exports = router;
