const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

// No authentication required - all routes are public
router.get('/available-users', groupController.getAvailableUsers); // Must come before /:id
router.get('/', groupController.getAll);
router.get('/:id', groupController.getById);
router.post('/', groupController.create);
router.put('/:id', groupController.update);
router.post('/:id/members', groupController.addMembers);
router.delete('/:id/members/:memberId', groupController.removeMember);
router.delete('/:id', groupController.deleteGroup);

module.exports = router;

