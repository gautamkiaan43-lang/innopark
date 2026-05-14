const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');

// No authentication required - all routes are public
router.get('/', departmentController.getAll);
router.get('/:id', departmentController.getById);
router.post('/', departmentController.create);
router.put('/:id', departmentController.update);
router.delete('/:id', departmentController.deleteDept);

module.exports = router;

