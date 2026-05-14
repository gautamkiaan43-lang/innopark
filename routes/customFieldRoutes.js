// =====================================================
// Custom Field Routes
// =====================================================

const express = require('express');
const router = express.Router();
const customFieldController = require('../controllers/customFieldController');

// All routes are currently public as per existing pattern
// Ideally should add authentication middleware later

router.get('/', customFieldController.getAll);
router.get('/:id', customFieldController.getById);
router.post('/', customFieldController.create);
router.put('/:id', customFieldController.update);
router.delete('/:id', customFieldController.deleteField);

module.exports = router;
