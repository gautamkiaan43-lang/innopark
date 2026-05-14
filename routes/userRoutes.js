const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole, ROLES } = require('../middleware/auth');

// Applied authentication to all user management routes
router.use(verifyToken);
// Restricted to ADMIN and SUPERADMIN only
router.use(requireRole([ROLES.SUPERADMIN, ROLES.ADMIN]));

// User management routes
router.get('/', userController.getAll);
router.post('/', userController.create);
router.post('/:id/reset-password', userController.resetPassword);

module.exports = router;

