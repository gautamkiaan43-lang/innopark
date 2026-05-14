const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for optional file upload
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB for logo
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Optional file upload middleware
const optionalUpload = (req, res, next) => {
  // Only process if Content-Type is multipart/form-data
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    upload.single('logo')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload failed'
        });
      }
      next();
    });
  } else {
    // No file upload, continue normally
    next();
  }
};

// Settings Routes
// GET all settings
router.get('/', settingsController.get);

// GET settings by category
router.get('/category/:category', settingsController.getByCategory);

// GET export settings
router.get('/export', settingsController.exportSettings);

// GET single setting
router.get('/:key', settingsController.getSingle);

// POST initialize default settings
router.post('/initialize', settingsController.initialize);

// POST reset settings to default
router.post('/reset', settingsController.reset);

// POST import settings
router.post('/import', settingsController.importSettings);

// PUT update single setting (with optional file upload)
router.put('/',
  optionalUpload,
  settingsController.update
);

// PUT bulk update settings
router.put('/bulk',
  settingsController.bulkUpdate
);

// DELETE a setting
router.delete('/:key', settingsController.deleteSetting);

module.exports = router;

