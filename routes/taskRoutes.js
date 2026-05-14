const express = require('express');
const router = express.Router();
const controller = require('../controllers/taskController');
const { verifyToken } = require('../middleware/auth');

// Base path: /api/v1/tasks

router.use(verifyToken);

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.put('/:id/complete', controller.markComplete);
router.put('/:id/reopen', controller.reopen);

module.exports = router;
