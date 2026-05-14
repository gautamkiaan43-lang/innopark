const express = require('express');
const router = express.Router();
const estimateController = require('../controllers/estimateController');

// No authentication required - all routes are public
router.get('/', estimateController.getAll);
router.post('/', estimateController.create);
router.post('/:id/convert-to-invoice', estimateController.convertToInvoice);
router.post('/:id/send-email', estimateController.sendEmail);
router.get('/:id', estimateController.getById);
router.get('/:id/pdf', estimateController.getPDF);
router.put('/:id', estimateController.update);
router.delete('/:id', estimateController.delete);

module.exports = router;

