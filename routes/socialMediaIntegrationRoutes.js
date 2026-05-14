const express = require('express');
const router = express.Router();
const socialMediaIntegrationController = require('../controllers/socialMediaIntegrationController');

// No authentication required - all routes are public
router.get('/', socialMediaIntegrationController.getAll);
router.get('/:id', socialMediaIntegrationController.getById);
router.post('/', socialMediaIntegrationController.create);
router.put('/:id', socialMediaIntegrationController.update);
router.delete('/:id', socialMediaIntegrationController.delete);
router.post('/:id/connect', socialMediaIntegrationController.connect);
router.post('/:id/disconnect', socialMediaIntegrationController.disconnect);

module.exports = router;

