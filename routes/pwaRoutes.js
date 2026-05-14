// =====================================================
// PWA Routes
// Progressive Web App Settings API
// =====================================================

const express = require('express');
const router = express.Router();
const pwaController = require('../controllers/pwaController');
const { verifyToken, requireRole, ROLES } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for PWA icon upload
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const pwaUploadDir = path.join(uploadDir, 'pwa');

// Ensure PWA upload directory exists
if (!fs.existsSync(pwaUploadDir)) {
    fs.mkdirSync(pwaUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, pwaUploadDir);
    },
    filename: (req, file, cb) => {
        // Use fixed name for PWA icon
        const ext = path.extname(file.originalname);
        cb(null, `pwa-icon-${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB max for icon
    },
    fileFilter: (req, file, cb) => {
        // Only allow PNG images (best for PWA icons)
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PNG, JPEG, and WebP images are allowed for PWA icons'), false);
        }
    }
});

// =====================================================
// PUBLIC ROUTES (No Auth Required)
// =====================================================

// GET /api/v1/pwa - Get PWA settings (public read)
router.get('/', pwaController.getPwaSettings);

// GET /api/v1/pwa/manifest - Get dynamic manifest.json
router.get('/manifest', pwaController.getManifest);

// =====================================================
// PROTECTED ROUTES (Super Admin Only)
// =====================================================

// PUT /api/v1/pwa - Update PWA settings (Super Admin Only)
router.put('/',
    verifyToken,
    requireRole(ROLES.SUPERADMIN),
    upload.single('icon'),
    pwaController.updatePwaSettings
);

module.exports = router;
