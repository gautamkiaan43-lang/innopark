// =====================================================
// Credit Note Routes
// =====================================================

const express = require('express');
const router = express.Router();
const creditNoteController = require('../controllers/creditNoteController');

// No authentication required - all routes are public
router.get('/', creditNoteController.getAll);
router.get('/:id', creditNoteController.getById);
router.post('/', creditNoteController.create);
router.put('/:id', creditNoteController.update);
router.delete('/:id', creditNoteController.deleteCreditNote);

module.exports = router;

