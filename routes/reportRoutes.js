const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, requireRole, ROLES } = require('../middleware/auth');

// Applied authentication to all report routes
router.use(verifyToken);
// Restricted to ADMIN and SUPERADMIN only
router.use(requireRole([ROLES.SUPERADMIN, ROLES.ADMIN]));

// Report routes
router.get('/sales', reportController.getSalesReport);
router.get('/revenue', reportController.getRevenueReport);
router.get('/projects', reportController.getProjectStatusReport);
router.get('/employees', reportController.getEmployeePerformanceReport);
router.get('/summary', reportController.getReportsSummary);

// New report endpoints
router.get('/expenses-summary', reportController.getExpensesSummary);
router.get('/invoices-summary', reportController.getInvoicesSummary);
router.get('/invoice-details', reportController.getInvoiceDetails);
router.get('/income-vs-expenses', reportController.getIncomeVsExpenses);
router.get('/payments-summary', reportController.getPaymentsSummary);
router.get('/timesheets', reportController.getTimesheetsReport);
router.get('/projects-summary', reportController.getProjectsReport);

module.exports = router;

