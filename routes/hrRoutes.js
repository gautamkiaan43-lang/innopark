const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const hrController = require('../controllers/hrController');

router.use(verifyToken);

// Shifts
router.get('/shifts', hrController.getShifts);
router.post('/shifts', hrController.createShift);
router.delete('/shifts/:id', hrController.deleteShift);

// Leave Types
router.get('/leave-types', hrController.getLeaveTypes);
router.post('/leave-types', hrController.createLeaveType);
router.delete('/leave-types/:id', hrController.deleteLeaveType);

// Settings
router.get('/attendance-settings', hrController.getAttendanceSettings);
router.put('/attendance-settings', hrController.updateAttendanceSettings);

module.exports = router;
