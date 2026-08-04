const express = require('express');
const router = express.Router();
const multer = require('multer');

// Controllers
const authController = require('../controllers/authController');

// Middlewares
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// MULTER CONFIG
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
    }
});

// Auth Routes
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Profile Routes
router.get('/profile', verifyToken, authController.getProfile);
router.patch('/profile', verifyToken, authController.updateProfile);
router.patch('/change-password', verifyToken, authController.changePassword);
router.patch('/profile/photo', verifyToken, upload.single('photo'), authController.uploadProfilePhoto);

// Admin User Management Routes
router.get('/all', verifyToken, checkRole('admin'), authController.getAllUsers);
router.delete('/users/:id', verifyToken, checkRole('admin'), authController.deleteUser);
router.get('/online', verifyToken, authController.getOnlineUsers);

module.exports = router;
