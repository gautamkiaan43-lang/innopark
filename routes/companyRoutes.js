// =====================================================
// Company Routes
// =====================================================

const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// No authentication required - all routes are public
router.get('/', companyController.getAll);
router.post('/', companyController.create);
router.get('/:id', companyController.getById);
router.get('/:id/details', companyController.getCompanyWithDetails);
router.put('/:id', companyController.update);
router.delete('/:id', companyController.deleteCompany);

// Company activities
router.get('/:id/activities', companyController.getCompanyActivities);
router.post('/:id/activities', companyController.addCompanyActivity);

// Company contacts
router.post('/:id/contacts', companyController.addContact);
router.get('/:id/contacts', companyController.getContacts);

module.exports = router;


