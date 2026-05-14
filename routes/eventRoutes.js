const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

// No authentication required - all routes are public
router.get('/upcoming', eventController.getUpcoming);  // Must be before /:id
router.get('/', eventController.getAll);
router.get('/:id', eventController.getById);
router.post('/', eventController.create);
router.put('/:id', eventController.update);
router.delete('/:id', eventController.delete);

module.exports = router;

