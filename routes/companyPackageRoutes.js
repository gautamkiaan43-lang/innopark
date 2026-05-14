// =====================================================
// Company Package Routes
// =====================================================

const express = require('express');
const router = express.Router();
const companyPackageController = require('../controllers/companyPackageController');

// No authentication required - all routes are public
router.get('/', companyPackageController.getAll);
router.post('/', companyPackageController.create);
router.get('/:id', companyPackageController.getById);
router.put('/:id', companyPackageController.update);
router.delete('/:id', companyPackageController.deletePackage);

module.exports = router;

