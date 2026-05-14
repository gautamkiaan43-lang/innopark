// =====================================================
// Notification Settings Routes
// =====================================================

const express = require('express');
const router = express.Router();
const notificationSettingsController = require('../controllers/notificationSettingsController');
const { verifyToken, requireRole, ROLES } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(verifyToken);
router.use(requireRole(ROLES.ADMIN));

// Get categories
router.get('/categories', notificationSettingsController.getCategories);

// Get all notification settings
router.get('/', notificationSettingsController.getAll);

// Get single notification setting
router.get('/:id', notificationSettingsController.getById);

// Update notification setting
router.put('/:id', notificationSettingsController.update);

module.exports = router;

