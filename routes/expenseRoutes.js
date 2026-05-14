const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/expenses');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and documents are allowed'));
  }
});

// Categories endpoint (must be before /:id)
router.get('/categories', expenseController.getCategories);

// Export endpoints (must be before /:id)
router.get('/export/excel', expenseController.exportExcel);
router.get('/export/print', expenseController.exportPrint);

// CRUD operations
router.get('/', expenseController.getAll);
router.post('/', expenseController.create);
router.get('/:id', expenseController.getById);
router.put('/:id', expenseController.update);
router.delete('/:id', expenseController.delete);

// Approve/Reject endpoints
router.post('/:id/approve', expenseController.approve);
router.post('/:id/reject', expenseController.reject);

// File upload endpoint
router.post('/:id/upload', upload.single('file'), expenseController.uploadFile);

module.exports = router;
