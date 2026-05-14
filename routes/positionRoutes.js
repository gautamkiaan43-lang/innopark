const express = require('express');
const router = express.Router();
const positionController = require('../controllers/positionController');

// No authentication required - all routes are public
router.get('/', positionController.getAll);
router.get('/:id', positionController.getById);
router.post('/', positionController.create);
router.put('/:id', positionController.update);
router.delete('/:id', positionController.deletePosition);

module.exports = router;

