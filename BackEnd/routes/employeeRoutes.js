const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/employeeController');
const multer = require('multer');
const path = require('path');

// Configure Multer for local disk storage
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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file PDF atau Gambar (JPG, PNG) yang diizinkan!'));
        }
    }
});

// GET All Employees
router.get('/employees', verifyToken, controller.get_employees);

// GET Departments
router.get('/departments', verifyToken, controller.get_departments);

// PUT Update Department Head
router.put('/departments/head', verifyToken, controller.set_department_head);

// PUT Update Department Structure (Canvas)
router.put('/departments/structure', verifyToken, controller.update_department_structure);

// POST New Employee (HRGA usage) with PDF Uploads
router.post('/employees', verifyToken, upload.fields([
    { name: 'ktp_file', maxCount: 1 },
    { name: 'kk_file', maxCount: 1 },
    { name: 'npwp_file', maxCount: 1 },
    { name: 'ijazah_file', maxCount: 1 }
]), controller.post_employees);

// PUT Update Employee
router.put('/employees/:id', verifyToken, upload.fields([
    { name: 'ktp_file', maxCount: 1 },
    { name: 'kk_file', maxCount: 1 },
    { name: 'npwp_file', maxCount: 1 },
    { name: 'ijazah_file', maxCount: 1 }
]), controller.put_employees);

// DELETE Bulk Employees
router.delete('/employees/bulk', verifyToken, controller.delete_employees_bulk);

// DELETE Employee
router.delete('/employees/:id', verifyToken, controller.delete_employees);

// POST Bulk Employees (HRGA Excel Import)
router.post('/employees/bulk', verifyToken, controller.post_employees_bulk);

// PUT Update Profile (Self-service)
router.put('/profile', verifyToken, controller.update_profile);


module.exports = router;
