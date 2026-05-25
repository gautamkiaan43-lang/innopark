const express = require('express');
const router = express.Router();
const userViewPreferenceController = require('../controllers/userViewPreferenceController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication to all view preference routes
router.use(verifyToken);

router.get('/', userViewPreferenceController.getPreferences);
router.post('/', userViewPreferenceController.savePreference);

module.exports = router;
