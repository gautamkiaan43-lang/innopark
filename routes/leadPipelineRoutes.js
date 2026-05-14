const express = require('express');
const router = express.Router();
const leadPipelineController = require('../controllers/leadPipelineController');
const { verifyToken } = require('../middleware/auth');

// Pipelines
router.get('/', verifyToken, leadPipelineController.getAllPipelines);
router.post('/', verifyToken, leadPipelineController.createPipeline);
router.put('/:id', verifyToken, leadPipelineController.updatePipeline);
router.delete('/:id', verifyToken, leadPipelineController.deletePipeline);

// Stages (nested under pipeline)
router.get('/:pipeline_id/stages', verifyToken, leadPipelineController.getStagesByPipelineId);
router.post('/:pipeline_id/stages', verifyToken, leadPipelineController.createStage);
router.put('/:pipeline_id/stages/:stage_id', verifyToken, leadPipelineController.updateStage);
router.delete('/:pipeline_id/stages/:stage_id', verifyToken, leadPipelineController.deleteStage);
router.patch('/:pipeline_id/stages/reorder', verifyToken, leadPipelineController.reorderStages);

module.exports = router;
