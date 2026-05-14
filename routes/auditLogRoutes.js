// =====================================================
// Audit Log Routes
// =====================================================

const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');

// No authentication required - all routes are public
router.get('/', auditLogController.getAll);
router.get('/:id', auditLogController.getById);
router.post('/', auditLogController.create);

module.exports = router;

