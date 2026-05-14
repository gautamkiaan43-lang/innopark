const express = require('express');
const router = express.Router();
const leadSourceController = require('../controllers/leadSourceController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, leadSourceController.getAll);
router.get('/:id', verifyToken, leadSourceController.getById);
router.post('/', verifyToken, leadSourceController.create);
router.put('/:id', verifyToken, leadSourceController.update);
router.delete('/:id', verifyToken, leadSourceController.remove);

module.exports = router;
