// =====================================================
// Authentication Routes
// =====================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { optionalAuth } = require('../middleware/auth');

// Public routes - no authentication required
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Routes that use optionalAuth - will get userId from JWT if token provided
router.get('/me', optionalAuth, authController.getCurrentUser);
router.put('/me', optionalAuth, authController.updateCurrentUser);
router.put('/change-password', optionalAuth, authController.changePassword);

module.exports = router;

