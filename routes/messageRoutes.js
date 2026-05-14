const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { optionalAuth } = require('../middleware/auth');

router.use(optionalAuth);

router.get('/available-users', messageController.getAvailableUsers); // Must come before /:id
router.get('/', messageController.getAll);
router.get('/:id', messageController.getById);
router.post('/', messageController.create);
router.put('/:id', messageController.update);
router.delete('/:id', messageController.deleteMessage);

module.exports = router;

