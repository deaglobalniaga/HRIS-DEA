const express = require('express');
const router = express.Router();
const multer = require('multer');

// Controllers
const authController = require('../controllers/authController');

// Middlewares
const { verifyToken } = require('../middlewares/authMiddleware');
const verifyTurnstile = require('../middlewares/turnstileMiddleware');

// MULTER CONFIG - Memory storage because we will upload to Supabase Bucket in controllers
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type.'));
        }
    }
});

// Auth Routes
router.post('/signup', upload.any(), authController.signup);
router.post('/login', verifyTurnstile, authController.login);
router.post('/logout', authController.logout);
router.post('/setup-password', verifyToken, authController.setupPassword);
router.patch('/change-password', verifyToken, authController.changePassword);
router.patch('/change-username', verifyToken, authController.changeUsername);

// Password Reset with 6-Digit OTP & 10-Minute Anti-Database Fatigue Cooldown
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-otp', authController.verifyResetOtp);
router.post('/reset-password', authController.resetPassword);

// Profile Routes
router.get('/profile', verifyToken, authController.getProfile);
router.patch('/profile', verifyToken, upload.any(), authController.updateProfile);

// Security & MFA Routes
router.get('/mfa/generate', verifyToken, authController.requestMfa);
router.post('/mfa/verify', verifyToken, authController.verifyMfa);
router.post('/mfa/disable', verifyToken, authController.disableMfa);
router.patch('/recovery-email', verifyToken, authController.saveRecoveryEmail);

// User Devices
router.get('/devices', verifyToken, authController.getUserDevices);
router.delete('/devices/:id', verifyToken, authController.removeUserDevice);

// Face Biometrics & Documents Management
router.post('/face-enroll', verifyToken, authController.enrollFace);
router.delete('/face-descriptor', verifyToken, authController.deleteFaceDescriptor);
router.delete('/document/:id', verifyToken, authController.deleteDocument);
router.delete('/document-by-type/:docType', verifyToken, authController.deleteDocumentByType);

module.exports = router;

