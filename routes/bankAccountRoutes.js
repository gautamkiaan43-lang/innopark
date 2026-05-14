// =====================================================
// Bank Account Routes
// =====================================================

const express = require('express');
const router = express.Router();
const bankAccountController = require('../controllers/bankAccountController');

// No authentication required - all routes are public
router.get('/', bankAccountController.getAll);
router.get('/:id', bankAccountController.getById);
router.post('/', bankAccountController.create);
router.put('/:id', bankAccountController.update);
router.delete('/:id', bankAccountController.delete);

module.exports = router;

