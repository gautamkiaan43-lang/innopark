const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// GET all orders
router.get('/', orderController.getAll);

// GET order by ID
router.get('/:id', orderController.getById);

// POST create order
router.post('/', orderController.create);

// PUT update order
router.put('/:id', orderController.update);

// PATCH update order status
router.patch('/:id/status', orderController.updateStatus);

// DELETE order (soft delete)
router.delete('/:id', orderController.delete);

// GET order PDF
router.get('/:id/pdf', orderController.getPDF);

module.exports = router;

