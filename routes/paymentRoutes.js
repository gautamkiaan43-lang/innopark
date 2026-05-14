// =====================================================
// Payment Routes
// =====================================================

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// No authentication required - all routes are public
router.get('/', paymentController.getAll);
router.post('/', paymentController.create);
router.post('/bulk', paymentController.createBulk);
router.get('/:id', paymentController.getById);
router.put('/:id', paymentController.update);
router.delete('/:id', paymentController.delete);

module.exports = router;

