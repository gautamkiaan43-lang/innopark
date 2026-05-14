// =====================================================
// Contact Routes
// =====================================================
// Routes for managing individual contacts (people only)
// Contacts represent only individuals, not organizations
// =====================================================

const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// Contact CRUD operations
router.get('/', contactController.getAll);
router.get('/:id', contactController.getById);
router.post('/', contactController.create);
router.put('/:id', contactController.update);
router.delete('/:id', contactController.deleteContact);

// Contact activities
router.get('/:id/activities', contactController.getActivities);
router.post('/:id/activities', contactController.addActivity);

module.exports = router;

