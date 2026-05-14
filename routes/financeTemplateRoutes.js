const express = require('express');
const router = express.Router();
const financeTemplateController = require('../controllers/financeTemplateController');

// No authentication required - all routes are public
router.get('/types', financeTemplateController.getTypes); // Get valid template types
router.get('/', financeTemplateController.getAll);
router.get('/:id', financeTemplateController.getById);
router.post('/', financeTemplateController.create);
router.put('/:id', financeTemplateController.update);
router.delete('/:id', financeTemplateController.delete);
router.post('/:id/generate-report', financeTemplateController.generateReport);

module.exports = router;

