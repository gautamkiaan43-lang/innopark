const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getRoles, getRolePermissions, updateRolePermissions, addRole, deleteRole } = require('../controllers/roleController');

router.get('/', verifyToken, getRoles);
router.post('/', verifyToken, addRole);
router.get('/:id/permissions', verifyToken, getRolePermissions);
router.put('/:id/permissions', verifyToken, updateRolePermissions);
router.delete('/:id', verifyToken, deleteRole);

module.exports = router;
