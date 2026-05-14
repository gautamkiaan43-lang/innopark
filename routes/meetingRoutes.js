const express = require('express');
const router = express.Router();
const controller = require('../controllers/meetingController');

// Base path: /api/v1/meetings

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
