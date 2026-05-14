// =====================================================
// Notification Routes
// =====================================================

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// No authentication required - all routes are public
router.get('/', notificationController.getAll);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/:id', notificationController.getById);
router.post('/', notificationController.create);
router.put('/:id/read', notificationController.markAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.delete('/:id', notificationController.delete);

module.exports = router;

