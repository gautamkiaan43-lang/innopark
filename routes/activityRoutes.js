const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, activityController.getAll);
router.post('/', verifyToken, activityController.create);
router.patch('/:id', verifyToken, activityController.update);
router.patch('/:id/pin', verifyToken, activityController.togglePin);
router.delete('/:id', verifyToken, activityController.remove);

module.exports = router;
