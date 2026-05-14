const express = require('express');
const router = express.Router();
const dealController = require('../controllers/dealController');
const { verifyToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// Apply authentication to all routes
router.use(verifyToken);

// Using 'proposals' permission as Deals replaces Proposals and permissions might not be updated yet.
// If 'deals' permission is needed, it must be added to DB.
const permissionModule = 'proposals';

router.get('/filters', dealController.getFilters);
router.get('/kanban-stats', requirePermission(permissionModule), dealController.getKanbanStats);
router.get('/', requirePermission(permissionModule), dealController.getAll);
// Deal contacts (link existing master contacts only) - must be before /:id
router.get('/:id/contacts', requirePermission(permissionModule), dealController.getDealContacts);
router.post('/:id/contacts', requirePermission(permissionModule), dealController.addContactToDeal);
router.delete('/:id/contacts/:contactId', requirePermission(permissionModule), dealController.removeContactFromDeal);
// Deal activities (for timeline panel)
router.get('/:id/activities', requirePermission(permissionModule), dealController.getDealActivities);
router.post('/:id/activities', requirePermission(permissionModule), dealController.addDealActivity);
router.get('/:id', requirePermission(permissionModule), dealController.getById);
// router.get('/:id/pdf', requirePermission(permissionModule), dealController.getPDF);
router.post('/', requirePermission(permissionModule), dealController.create);
// router.post('/:id/duplicate', requirePermission(permissionModule), dealController.duplicate);
// router.post('/:id/convert-to-invoice', requirePermission(permissionModule), dealController.convertToInvoice);
// router.post('/:id/send-email', requirePermission(permissionModule), dealController.sendEmail);
router.put('/:id', requirePermission(permissionModule), dealController.update);
router.put('/:id/status', requirePermission(permissionModule), dealController.updateStatus);
router.patch('/:id/stage', requirePermission(permissionModule), dealController.updateStage);
router.delete('/:id', requirePermission(permissionModule), dealController.delete);

module.exports = router;
