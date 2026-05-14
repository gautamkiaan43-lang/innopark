const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

// No authentication required - all routes are public
router.get('/', ticketController.getAll);
router.get('/:id', ticketController.getById);
router.post('/', ticketController.create);
router.put('/:id', ticketController.update);
router.delete('/:id', ticketController.delete);
router.post('/:id/comments', ticketController.addComment);

module.exports = router;

