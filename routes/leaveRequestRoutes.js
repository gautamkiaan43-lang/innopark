// =====================================================
// Leave Request Routes
// =====================================================

const express = require('express');
const router = express.Router();
const leaveRequestController = require('../controllers/leaveRequestController');

// No authentication required - all routes are public
router.get('/', leaveRequestController.getAll);
router.get('/:id', leaveRequestController.getById);
router.post('/', leaveRequestController.create);
router.put('/:id', leaveRequestController.update);
router.delete('/:id', leaveRequestController.delete);

module.exports = router;

