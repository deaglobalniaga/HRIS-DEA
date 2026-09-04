const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const controller = require('../controllers/certificationController');
const { verifyToken, isHSE, blockSuperAdmin } = require('../middlewares/authMiddleware');

// Configure secure memory storage for cloud uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const ext = path.extname(file.originalname || '').toLowerCase();
        const dangerousExts = ['.exe', '.php', '.sh', '.bat', '.js', '.svg', '.html', '.htm', '.vbs'];

        if (dangerousExts.includes(ext) || file.originalname.includes('.php') || file.originalname.includes('.svg')) {
            return cb(new Error('Tipe berkas berbahaya terdeteksi dan diblokir demi keamanan!'));
        }

        if (allowed.includes(file.mimetype.toLowerCase())) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file PDF atau Gambar (JPG, PNG, WEBP) yang diizinkan!'));
        }
    }
});

// Personal Certifications (Protected from Superadmin)
router.get('/certifications/my-certifications', verifyToken, blockSuperAdmin, controller.get_my_certifications);
router.post('/certifications/my-certifications', verifyToken, blockSuperAdmin, upload.any(), controller.add_my_certification);

// General & Matrix Certifications (Protected from Superadmin)
router.get('/certifications', verifyToken, blockSuperAdmin, controller.get_certifications);
router.get('/certifications/matrix', verifyToken, blockSuperAdmin, controller.get_matrix);
router.get('/certificate-types', verifyToken, controller.get_certificate_types);
router.post('/certificate-types', verifyToken, blockSuperAdmin, controller.create_certificate_type);

// Admin & HSE Management (Protected from Superadmin)
router.post('/certifications', verifyToken, blockSuperAdmin, isHSE, upload.any(), controller.add_certification);
router.patch('/certifications/:id/approve', verifyToken, blockSuperAdmin, isHSE, controller.approve_certification);
router.patch('/certifications/:id/reject', verifyToken, blockSuperAdmin, isHSE, controller.reject_certification);
router.delete('/certifications/:id', verifyToken, blockSuperAdmin, controller.delete_certification);

module.exports = router;
