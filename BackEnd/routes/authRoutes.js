const express = require('express');
const router = express.Router();
const multer = require('multer');

// Controllers
const authController = require('../controllers/authController');

// Middlewares
const { verifyToken, isSuperAdmin, isAdmin } = require('../middleware/authMiddleware');

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
router.get('/jwt-secret', verifyToken, isSuperAdmin, authController.getJwtSecretEndpoint);
router.post('/jwt-secret/regenerate', verifyToken, isSuperAdmin, authController.regenerateJwtSecret);
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/setup-password', verifyToken, authController.setup_password);
router.post('/forgot-password', authController.forgot_password);
router.post('/reset-password', authController.resetPassword);


const path = require('path');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/documents/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadDisk = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Hanya file PDF yang diizinkan!'));
        }
    }
});

const mfaController = require('../controllers/mfaController');

// Profile Routes
router.get('/profile', verifyToken, authController.getProfile);
router.patch('/profile', verifyToken, uploadDisk.fields([{ name: 'ktp_file', maxCount: 1 }, { name: 'kk_file', maxCount: 1 }, { name: 'npwp_file', maxCount: 1 }, { name: 'ijazah_file', maxCount: 1 }]), authController.updateProfile);
router.patch('/change-password', verifyToken, authController.changePassword);
router.patch('/profile/photo', verifyToken, upload.single('photo'), authController.uploadProfilePhoto);

// Security & MFA Routes
router.get('/mfa/generate', verifyToken, mfaController.generateMfa);
router.post('/mfa/verify', verifyToken, mfaController.verifyAndEnableMfa);
router.post('/mfa/disable', verifyToken, mfaController.disableMfa);
router.patch('/recovery-email', verifyToken, mfaController.setRecoveryEmail);
router.get('/devices', verifyToken, mfaController.getDevices);
router.delete('/devices/:deviceId', verifyToken, mfaController.removeDevice);

// Admin User Management Routes
router.get('/all', verifyToken, isAdmin, authController.getAllUsers);
router.delete('/users/:id', verifyToken, isAdmin, authController.deleteUser);
router.get('/online', verifyToken, authController.getOnlineUsers);

module.exports = router;
