const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');
const { verifyToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// Apply authentication to all routes
router.use(verifyToken);

// Apply permission checks based on HTTP method
// GET requests require can_view, POST requires can_add, PUT/PATCH require can_edit, DELETE requires can_delete
router.get('/filters', requirePermission('proposals'), proposalController.getFilters);
router.get('/', requirePermission('proposals'), proposalController.getAll);
router.get('/:id', requirePermission('proposals'), proposalController.getById);
router.get('/:id/pdf', requirePermission('proposals'), proposalController.getPDF);
router.post('/', requirePermission('proposals'), proposalController.create);
router.post('/:id/duplicate', requirePermission('proposals'), proposalController.duplicate);
router.post('/:id/convert-to-invoice', requirePermission('proposals'), proposalController.convertToInvoice);
router.post('/:id/send-email', requirePermission('proposals'), proposalController.sendEmail);
router.put('/:id', requirePermission('proposals'), proposalController.update);
router.put('/:id/status', requirePermission('proposals'), proposalController.updateStatus);
router.delete('/:id', requirePermission('proposals'), proposalController.delete);

module.exports = router;

