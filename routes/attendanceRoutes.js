const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// Get all attendance records
router.get('/', attendanceController.getAll);

// Get attendance summary (calendar view)
router.get('/summary', attendanceController.getSummary);

// Get today's clock status for current user
router.get('/today-status', attendanceController.getTodayStatus);

// Get employee attendance for a month
router.get('/employee/:employeeId', attendanceController.getEmployeeAttendance);

// Get monthly calendar for employee
router.get('/calendar', attendanceController.getMonthlyCalendar);

// Get attendance percentage
router.get('/percentage', attendanceController.getAttendancePercentage);

// Get attendance by ID
router.get('/:id', attendanceController.getById);

// Mark attendance (create or update)
router.post('/', attendanceController.markAttendance);

// Check In - Clock in for dashboard
router.post('/check-in', attendanceController.checkIn);

// Check Out - Clock out for dashboard
router.post('/check-out', attendanceController.checkOut);

// Bulk mark attendance
router.post('/bulk', attendanceController.bulkMarkAttendance);

// Delete attendance
router.delete('/:id', attendanceController.deleteAttendance);

module.exports = router;
