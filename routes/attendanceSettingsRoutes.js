const express = require('express');
const router = express.Router();
const attendanceSettingsController = require('../controllers/attendanceSettingsController');
const { verifyToken, requireRole, ROLES } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// ================================================
// ATTENDANCE SETTINGS ROUTES
// ================================================

// GET /api/admin/attendance-settings - Get attendance settings (Allow both ADMIN and EMPLOYEE to view)
router.get('/', attendanceSettingsController.getAttendanceSettings);

// PUT /api/admin/attendance-settings - Update attendance settings (Admin only)
router.put('/', requireRole(ROLES.ADMIN), attendanceSettingsController.updateAttendanceSettings);

// ================================================
// SHIFT ROUTES
// ================================================

// GET /api/admin/attendance-settings/shifts - Get all shifts (Allow both ADMIN and EMPLOYEE to view)
router.get('/shifts', attendanceSettingsController.getAllShifts);

// GET /api/admin/attendance-settings/shifts/:id - Get single shift (Allow both ADMIN and EMPLOYEE to view)
router.get('/shifts/:id', attendanceSettingsController.getShiftById);

// POST /api/admin/attendance-settings/shifts - Create new shift (Admin only)
router.post('/shifts', requireRole(ROLES.ADMIN), attendanceSettingsController.createShift);

// PUT /api/admin/attendance-settings/shifts/:id - Update shift (Admin only)
router.put('/shifts/:id', requireRole(ROLES.ADMIN), attendanceSettingsController.updateShift);

// DELETE /api/admin/attendance-settings/shifts/:id - Delete shift (Admin only)
router.delete('/shifts/:id', requireRole(ROLES.ADMIN), attendanceSettingsController.deleteShift);

// POST /api/admin/attendance-settings/shifts/:id/set-default - Set default shift (Admin only)
router.post('/shifts/:id/set-default', requireRole(ROLES.ADMIN), attendanceSettingsController.setDefaultShift);

// ================================================
// SHIFT ROTATION ROUTES
// ================================================

// GET /api/admin/attendance-settings/shift-rotations - Get all rotations (Admin only)
router.get('/shift-rotations', requireRole(ROLES.ADMIN), attendanceSettingsController.getAllRotations);

// POST /api/admin/attendance-settings/shift-rotations - Create rotation (Admin only)
router.post('/shift-rotations', requireRole(ROLES.ADMIN), attendanceSettingsController.createRotation);

// DELETE /api/admin/attendance-settings/shift-rotations/:id - Delete rotation (Admin only)
router.delete('/shift-rotations/:id', requireRole(ROLES.ADMIN), attendanceSettingsController.deleteRotation);

// POST /api/admin/attendance-settings/shift-rotations/run - Run rotation (Admin only)
router.post('/shift-rotations/run', requireRole(ROLES.ADMIN), attendanceSettingsController.runRotation);

module.exports = router;

