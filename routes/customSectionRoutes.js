// =====================================================
// Custom Section Routes
// =====================================================

const express = require('express');
const router = express.Router();
const customSectionController = require('../controllers/customSectionController');

router.get('/', customSectionController.getAll);
router.get('/:id', customSectionController.getById);
router.post('/', customSectionController.create);
router.put('/:id', customSectionController.update);
router.delete('/:id', customSectionController.deleteSection);

module.exports = router;
