const express = require('express');
const router = express.Router();
const leaveSettingsController = require('../controllers/leaveSettingsController');
const { verifyToken, requireRole, ROLES } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// ================================================
// LEAVE TYPES ROUTES
// ================================================

// GET /api/leave-settings/leave-types - Get all leave types (Allow both ADMIN and EMPLOYEE)
router.get('/leave-types', leaveSettingsController.getAllLeaveTypes);

// GET /api/leave-settings/leave-types/:id - Get single leave type (Allow both ADMIN and EMPLOYEE)
router.get('/leave-types/:id', leaveSettingsController.getLeaveTypeById);

// POST /api/leave-settings/leave-types - Create new leave type (Admin only)
router.post('/leave-types', requireRole(ROLES.ADMIN), leaveSettingsController.createLeaveType);

// PUT /api/leave-settings/leave-types/:id - Update leave type (Admin only)
router.put('/leave-types/:id', requireRole(ROLES.ADMIN), leaveSettingsController.updateLeaveType);

// DELETE /api/leave-settings/leave-types/:id - Delete leave type (Admin only)
router.delete('/leave-types/:id', requireRole(ROLES.ADMIN), leaveSettingsController.deleteLeaveType);

// POST /api/leave-settings/leave-types/:id/archive - Archive leave type (Admin only)
router.post('/leave-types/:id/archive', requireRole(ROLES.ADMIN), leaveSettingsController.archiveLeaveType);

// POST /api/leave-settings/leave-types/:id/restore - Restore archived leave type (Admin only)
router.post('/leave-types/:id/restore', requireRole(ROLES.ADMIN), leaveSettingsController.restoreLeaveType);

// ================================================
// LEAVE GENERAL SETTINGS ROUTES
// ================================================

// GET /api/leave-settings/general-settings - Get leave general settings (Allow both ADMIN and EMPLOYEE)
router.get('/general-settings', leaveSettingsController.getGeneralSettings);

// POST /api/leave-settings/general-settings - Update leave general settings (Admin only)
router.post('/general-settings', requireRole(ROLES.ADMIN), leaveSettingsController.updateGeneralSettings);

module.exports = router;

