// =====================================================
// Project Template Routes
// =====================================================

const express = require('express');
const router = express.Router();
const projectTemplateController = require('../controllers/projectTemplateController');
const { verifyToken } = require('../middleware/auth');

// GET all project templates
router.get('/', verifyToken, projectTemplateController.getAll);

// GET single project template
router.get('/:id', verifyToken, projectTemplateController.getById);

// POST create project template
router.post('/', verifyToken, projectTemplateController.create);

// PUT update project template
router.put('/:id', verifyToken, projectTemplateController.update);

// DELETE project template
router.delete('/:id', verifyToken, projectTemplateController.delete);

module.exports = router;
