const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, blockSuperAdmin } = require('../middlewares/authMiddleware');
const controller = require('../controllers/employeeController');
const multer = require('multer');
const path = require('path');

// Configure Multer for secure In-Memory buffer storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
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

// GET All Employees (Protected from Superadmin)
router.get('/employees', verifyToken, blockSuperAdmin, controller.get_employees);

// GET Single Employee (Protected from Superadmin)
router.get('/employees/:id', verifyToken, blockSuperAdmin, controller.get_employee_by_id);

// GET Departments
router.get('/departments', verifyToken, controller.get_departments);
router.post('/departments', verifyToken, isAdmin, controller.create_department);
router.put('/departments/:id', verifyToken, isAdmin, controller.update_department);
router.delete('/departments/:id', verifyToken, isAdmin, controller.delete_department);

// Organization Hierarchy & History
router.get('/organization/history', verifyToken, controller.get_organization_history);
router.post('/organization/history', verifyToken, isAdmin, controller.save_organization_chart);

// Bulk Operations (HRGA / Admin only - Protected from Superadmin)
router.post('/employees/bulk', verifyToken, blockSuperAdmin, isAdmin, controller.bulk_create_employees);
router.delete('/employees/bulk', verifyToken, blockSuperAdmin, isAdmin, controller.bulk_delete_employees);

// POST New Employee (HRGA / Admin only - Protected from Superadmin)
router.post('/employees', verifyToken, blockSuperAdmin, isAdmin, upload.any(), controller.create_employee);

// PUT Update Employee (HRGA / Admin only - Protected from Superadmin)
router.put('/employees/:id', verifyToken, blockSuperAdmin, isAdmin, upload.any(), controller.update_employee);

// DELETE Employee (HRGA / Admin only - Protected from Superadmin)
router.delete('/employees/:id', verifyToken, blockSuperAdmin, isAdmin, controller.delete_employee);

// DELETE Employee Document (HRGA / Admin only - Protected from Superadmin)
router.delete('/employees/:id/documents/:docType', verifyToken, blockSuperAdmin, isAdmin, controller.delete_employee_document);

// PUT Verify & Activate New Employee Account (HRGA Admin only)
router.put('/employees/:id/verify', verifyToken, blockSuperAdmin, isAdmin, controller.verify_employee);

// DELETE Reject & Clean up New Employee Account (HRGA Admin only)
router.delete('/employees/:id/reject', verifyToken, blockSuperAdmin, isAdmin, controller.reject_employee);

// ROLE REQUESTS (Admin HRGA Request & Super Admin Review)
router.get('/role-requests', verifyToken, controller.get_role_requests);
router.post('/role-requests', verifyToken, isAdmin, controller.create_role_request);
router.put('/role-requests/:id/review', verifyToken, controller.review_role_request);

// Biometric Face Recognition (Protected from Superadmin)
router.get('/employees/:id/face-samples', verifyToken, blockSuperAdmin, controller.get_face_samples);
router.post('/employees/:id/face-samples', verifyToken, blockSuperAdmin, controller.save_face_samples);
router.delete('/employees/:id/face-samples/:index', verifyToken, blockSuperAdmin, controller.delete_single_face_sample);

// GET Export Employees to Excel (Protected from Superadmin)
router.get('/employees/export/excel', verifyToken, blockSuperAdmin, isAdmin, controller.export_employees_excel);

module.exports = router;

