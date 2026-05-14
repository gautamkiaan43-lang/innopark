// =====================================================
// Item Routes
// =====================================================

const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { uploadSingle } = require('../middleware/upload');

// No authentication required - all routes are public

router.get('/', itemController.getAll);
router.get('/:id', itemController.getById);
router.post('/', uploadSingle('image'), itemController.create);
router.put('/:id', uploadSingle('image'), itemController.update);
router.delete('/:id', itemController.delete);

module.exports = router;

