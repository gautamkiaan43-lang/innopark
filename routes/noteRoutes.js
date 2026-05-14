const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');

const { uploadMultiple } = require('../middleware/upload');

// Get all notes
router.get('/', noteController.getAll);

// Get note by ID
router.get('/:id', noteController.getById);

// Create note
router.post('/', uploadMultiple('files'), noteController.create);

// Update note
router.put('/:id', noteController.update);

// Delete note
router.delete('/:id', noteController.delete);

module.exports = router;

