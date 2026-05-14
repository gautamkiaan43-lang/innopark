// =====================================================
// Project Routes
// =====================================================

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { uploadSingle, handleUploadError } = require('../middleware/upload');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// Labels
router.get('/labels', projectController.getAllLabels);
router.post('/labels', projectController.createLabel);
router.delete('/labels/:id', projectController.deleteLabel);

router.get('/filters', projectController.getFilters);
router.get('/', projectController.getAll);
router.get('/:id', projectController.getById);
router.post('/', projectController.create);
router.post('/:id/upload', uploadSingle('file'), handleUploadError, projectController.uploadFile);
router.put('/:id', projectController.update);
router.delete('/:id', projectController.deleteProject);

// Project sub-resources
router.get('/:id/members', projectController.getMembers);
router.get('/:id/tasks', projectController.getTasks);
router.get('/:id/files', projectController.getFiles);

module.exports = router;

