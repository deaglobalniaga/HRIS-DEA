const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/employeeController');

// GET All Employees
router.get('/employees', verifyToken, controller.get_employees);

// GET Departments
router.get('/departments', verifyToken, controller.get_departments);

// PUT Update Department Head
router.put('/departments/head', verifyToken, controller.set_department_head);

// POST New Employee (HRGA usage)
router.post('/employees', verifyToken, controller.post_employees);

// PUT Update Employee
router.put('/employees/:id', verifyToken, controller.put_employees);

// POST Bulk Employees (HRGA Excel Import)
router.post('/employees/bulk', verifyToken, controller.post_employees_bulk);

// PUT Update Profile (Self-service)
router.put('/profile', verifyToken, controller.update_profile);


module.exports = router;
