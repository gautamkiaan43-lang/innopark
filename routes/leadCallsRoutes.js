const express = require('express');
const router = express.Router();
const leadCallsController = require('../controllers/leadCallsController');
const { verifyToken, requireRole, ROLES } = require('../middleware/auth');

// All routes require Admin authentication
router.use(verifyToken);
router.use(requireRole(ROLES.ADMIN));

// ================================================
// LEAD CALL LOGS ROUTES
// ================================================

// GET /api/admin/leads/:lead_id/calls - Get all calls for a lead
router.get('/:lead_id/calls', leadCallsController.getCallsByLeadId);

// POST /api/admin/leads/:lead_id/calls - Create a new call log
router.post('/:lead_id/calls', leadCallsController.createCall);

// PUT /api/admin/leads/:lead_id/calls/:call_id - Update a call log
router.put('/:lead_id/calls/:call_id', leadCallsController.updateCall);

// DELETE /api/admin/leads/:lead_id/calls/:call_id - Delete a call log
router.delete('/:lead_id/calls/:call_id', leadCallsController.deleteCall);

module.exports = router;









