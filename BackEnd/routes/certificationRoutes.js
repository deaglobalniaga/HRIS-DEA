const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/certificationController');
const multer = require('multer');
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
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file PDF dan Gambar yang diizinkan!'));
        }
    }
});

router.get('/certifications', verifyToken, controller.get_certifications);
router.get('/certifications/user/:userId', verifyToken, controller.get_user_certifications);
router.post('/certifications', verifyToken, upload.array('attachments', 10), controller.add_certification);
router.delete('/certifications/:id', verifyToken, controller.delete_certification);

module.exports = router;
