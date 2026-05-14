const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// No authentication required - all routes are public

// Profile routes (must come before /:id to avoid conflicts)
router.get('/profile', employeeController.getProfile);
router.put('/profile', employeeController.updateProfile);
router.get('/dashboard', employeeController.getDashboardStats);

// CRUD routes
router.get('/', employeeController.getAll);
router.get('/:id', employeeController.getById);
router.post('/', employeeController.create);
router.put('/:id', employeeController.update);
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;

