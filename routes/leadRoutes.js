// =====================================================
// Lead Routes
// =====================================================

const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const leadCallsController = require('../controllers/leadCallsController');

// Authentication required - secure all routes
const { verifyToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// Apply verifyToken to all lead routes
router.use(verifyToken);


// IMPORTANT: Specific routes must come BEFORE parameterized routes (/:id)
// Otherwise Express will match /contacts as /:id with id="contacts"

// Contacts routes (for Leads Contacts tab) - MUST come before /:id routes
router.get('/contacts', leadController.getAllContacts);
router.get('/contacts/:id', leadController.getContactById);
router.post('/contacts', leadController.createContact);
router.put('/contacts/:id', leadController.updateContact);
router.delete('/contacts/:id', leadController.deleteContact);

// Labels routes - MUST come before /:id routes
router.get('/labels', leadController.getAllLabels);
router.post('/labels', leadController.createLabel);
router.delete('/labels/:label', leadController.deleteLabel);

// Call logs routes - MUST come before /:id routes
router.get('/:lead_id/calls', leadCallsController.getCallsByLeadId);
router.post('/:lead_id/calls', leadCallsController.createCall);
router.put('/:lead_id/calls/:call_id', leadCallsController.updateCall);
router.delete('/:lead_id/calls/:call_id', leadCallsController.deleteCall);

// Other specific routes
router.get('/overview', leadController.getOverview);
router.post('/bulk-action', leadController.bulkAction);
router.post('/import', leadController.importLeads);

// Parameterized routes (must come after specific routes)
// More specific routes should come before less specific ones
router.put('/:id/update-status', leadController.updateStatus);
router.put('/:id/labels', leadController.updateLeadLabels);
router.get('/', leadController.getAll);
router.get('/:id', leadController.getById);
router.post('/', leadController.create);
router.put('/:id', leadController.update);
router.delete('/:id', leadController.deleteLead);
router.patch('/:id/stage', leadController.updateStage);

module.exports = router;

