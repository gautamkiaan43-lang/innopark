const express = require('express');
const router = express.Router();
const dealPipelineController = require('../controllers/dealPipelineController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, dealPipelineController.getAllPipelines);
router.post('/', verifyToken, dealPipelineController.createPipeline);
router.put('/:id', verifyToken, dealPipelineController.updatePipeline);
router.delete('/:id', verifyToken, dealPipelineController.deletePipeline);

router.get('/:pipeline_id/stages', verifyToken, dealPipelineController.getStagesByPipelineId);
router.post('/:pipeline_id/stages', verifyToken, dealPipelineController.createStage);
router.put('/:pipeline_id/stages/:stage_id', verifyToken, dealPipelineController.updateStage);
router.delete('/:pipeline_id/stages/:stage_id', verifyToken, dealPipelineController.deleteStage);
router.patch('/:pipeline_id/stages/reorder', verifyToken, dealPipelineController.reorderStages);

module.exports = router;
