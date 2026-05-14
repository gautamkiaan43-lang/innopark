const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { uploadSingle, handleUploadError } = require('../middleware/upload');

// No authentication required - all routes are public
router.get('/', contractController.getAll);
router.get('/:id', contractController.getById);
router.get('/:id/pdf', contractController.getPDF);
router.post('/', uploadSingle('file'), handleUploadError, contractController.create);
router.put('/:id', uploadSingle('file'), handleUploadError, contractController.update);
router.put('/:id/status', contractController.updateStatus);
router.post('/:id/send-email', contractController.sendEmail);
router.delete('/:id', contractController.delete);

module.exports = router;

