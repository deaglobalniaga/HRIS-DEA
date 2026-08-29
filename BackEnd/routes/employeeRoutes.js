const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
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

// GET All Employees
router.get('/employees', verifyToken, controller.get_employees);

// GET Single Employee
router.get('/employees/:id', verifyToken, controller.get_employee_by_id);

// GET Departments
router.get('/departments', verifyToken, controller.get_departments);
router.post('/departments', verifyToken, isAdmin, controller.create_department);
router.put('/departments/:id', verifyToken, isAdmin, controller.update_department);
router.delete('/departments/:id', verifyToken, isAdmin, controller.delete_department);

// Organization Hierarchy & History
router.get('/organization/history', verifyToken, controller.get_organization_history);
router.post('/organization/history', verifyToken, isAdmin, controller.save_organization_chart);

// Bulk Operations (HRGA / Admin)
router.post('/employees/bulk', verifyToken, isAdmin, controller.bulk_create_employees);
router.delete('/employees/bulk', verifyToken, isAdmin, controller.bulk_delete_employees);

// POST New Employee (HRGA / Admin)
router.post('/employees', verifyToken, isAdmin, upload.any(), controller.create_employee);

// PUT Update Employee (HRGA / Admin)
router.put('/employees/:id', verifyToken, isAdmin, upload.any(), controller.update_employee);

// DELETE Employee (HRGA / Admin)
router.delete('/employees/:id', verifyToken, isAdmin, controller.delete_employee);

// DELETE Employee Document (HRGA / Admin)
router.delete('/employees/:id/documents/:docType', verifyToken, isAdmin, controller.delete_employee_document);

// PUT Verify & Activate New Employee Account (Super Admin)
router.put('/employees/:id/verify', verifyToken, controller.verify_employee);

// DELETE Reject & Clean up New Employee Account (Super Admin)
router.delete('/employees/:id/reject', verifyToken, controller.reject_employee);

// ROLE REQUESTS (Admin HRGA Request & Super Admin Review)
router.get('/role-requests', verifyToken, controller.get_role_requests);
router.post('/role-requests', verifyToken, isAdmin, controller.create_role_request);
router.put('/role-requests/:id/review', verifyToken, controller.review_role_request);

// Biometric Face Recognition (Multi-Sample Database Preview & Enrollment)
router.get('/employees/:id/face-samples', verifyToken, controller.get_face_samples);
router.post('/employees/:id/face-samples', verifyToken, controller.save_face_samples);
router.delete('/employees/:id/face-samples/:index', verifyToken, controller.delete_single_face_sample);

// GET Export Employees to Excel
router.get('/employees/export/excel', verifyToken, isAdmin, controller.export_employees_excel);

module.exports = router;

