// =====================================================
// Module Settings Routes (Company sidebar / permissions)
// GET|PUT|POST /api/v1/module-settings
// =====================================================

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const moduleSettingsController = require('../controllers/moduleSettingsController');

router.use(verifyToken);

router.get('/', moduleSettingsController.getModuleSettings);
router.put('/', moduleSettingsController.updateModuleSettings);
router.post('/reset', moduleSettingsController.resetModuleSettings);

module.exports = router;
