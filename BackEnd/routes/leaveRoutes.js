const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const controller = require('../controllers/leaveController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/documents/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'leave-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET Leaves for Calendar Monitoring
router.get('/leave-status', verifyToken, controller.get_leave_status);
router.get('/leaves', verifyToken, controller.get_leave_status);

// POST Record Leave Block (Admin HRGA Only - pure log recorder)
router.post('/leaves', verifyToken, isAdmin, upload.single('document'), controller.post_leaves);

// DELETE Leave Record
router.delete('/leaves/:id', verifyToken, isAdmin, controller.delete_leave);

module.exports = router;
