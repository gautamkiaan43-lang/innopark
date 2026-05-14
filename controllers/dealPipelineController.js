// =====================================================
// Deal Pipeline & Stages Controller (configurable from Settings)
// =====================================================

const pool = require('../config/db');

const getCompanyId = (req) => req.query.company_id || req.body.company_id || req.user?.company_id;

const getAllPipelines = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    if (!company_id) return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required" });

    const [rows] = await pool.execute(
      `SELECT * FROM deal_pipelines WHERE company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY is_default DESC, name ASC`,
      [company_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Deal pipelines getAll:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_38c4f1ee') : "Failed to fetch deal pipelines" });
  }
};

const createPipeline = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    if (!company_id) return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required" });

    const { name, is_default } = req.body;
    if (!name) return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_6d13c984') : "name is required" });

    if (is_default) {
      await pool.execute('UPDATE deal_pipelines SET is_default = 0 WHERE company_id = ?', [company_id]);
    }
    const [result] = await pool.execute(
      'INSERT INTO deal_pipelines (company_id, name, is_default) VALUES (?, ?, ?)',
      [company_id, name, is_default ? 1 : 0]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, name, is_default: !!is_default } });
  } catch (err) {
    console.error('Deal pipeline create:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_2cda429a') : "Failed to create deal pipeline" });
  }
};

const updatePipeline = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = getCompanyId(req);
    const { name, is_default } = req.body;

    if (is_default) {
      await pool.execute('UPDATE deal_pipelines SET is_default = 0 WHERE company_id = ?', [company_id]);
    }
    const [result] = await pool.execute(
      'UPDATE deal_pipelines SET name = COALESCE(?, name), is_default = COALESCE(?, is_default) WHERE id = ? AND company_id = ?',
      [name ?? null, is_default !== undefined ? (is_default ? 1 : 0) : null, id, company_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_5cf431e5') : "Pipeline not found" });
    res.json({ success: true, data: { id, updated: true } });
  } catch (err) {
    console.error('Deal pipeline update:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_810bcca8') : "Failed to update deal pipeline" });
  }
};

const deletePipeline = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = getCompanyId(req);
    const [result] = await pool.execute('UPDATE deal_pipelines SET is_deleted = 1 WHERE id = ? AND company_id = ?', [id, company_id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_5cf431e5') : "Pipeline not found" });
    res.json({ success: true, data: { id, deleted: true } });
  } catch (err) {
    console.error('Deal pipeline delete:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_10f5e1d3') : "Failed to delete deal pipeline" });
  }
};

const getStagesByPipelineId = async (req, res) => {
  try {
    const { pipeline_id } = req.params;
    const [rows] = await pool.execute(
      `SELECT * FROM deal_pipeline_stages WHERE pipeline_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY display_order ASC, name ASC`,
      [pipeline_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Deal stages getByPipeline:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_c72ab7fc') : "Failed to fetch stages" });
  }
};

const createStage = async (req, res) => {
  try {
    const { pipeline_id } = req.params;
    const { name, display_order, color, is_default } = req.body;
    if (!name) return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_6d13c984') : "name is required" });

    if (is_default) {
      await pool.execute('UPDATE deal_pipeline_stages SET is_default = 0 WHERE pipeline_id = ?', [pipeline_id]);
    }

    const order = display_order ?? 0;
    const [result] = await pool.execute(
      'INSERT INTO deal_pipeline_stages (pipeline_id, name, display_order, color, is_default) VALUES (?, ?, ?, ?, ?)',
      [pipeline_id, name, order, color || '#3B82F6', is_default ? 1 : 0]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, pipeline_id, name, display_order: order, color: color || '#3B82F6', is_default: !!is_default } });
  } catch (err) {
    console.error('Deal stage create:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_b8dd094b') : "Failed to create stage" });
  }
};

const updateStage = async (req, res) => {
  try {
    const { pipeline_id, stage_id } = req.params;
    const { name, display_order, color, is_default } = req.body;

    if (is_default) {
      await pool.execute('UPDATE deal_pipeline_stages SET is_default = 0 WHERE pipeline_id = ?', [pipeline_id]);
    }

    const [result] = await pool.execute(
      'UPDATE deal_pipeline_stages SET name = COALESCE(?, name), display_order = COALESCE(?, display_order), color = COALESCE(?, color), is_default = COALESCE(?, is_default) WHERE id = ? AND pipeline_id = ?',
      [name ?? null, display_order ?? null, color ?? null, is_default !== undefined ? (is_default ? 1 : 0) : null, stage_id, pipeline_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_23effa10') : "Stage not found" });
    res.json({ success: true, data: { id: stage_id, updated: true } });
  } catch (err) {
    console.error('Deal stage update:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_c69d0188') : "Failed to update stage" });
  }
};

const deleteStage = async (req, res) => {
  try {
    const { pipeline_id, stage_id } = req.params;
    const { transfer_stage_id } = req.body;

    // Check if deals exist in this stage
    const [deals] = await pool.execute('SELECT COUNT(*) as count FROM deals WHERE stage_id = ? AND is_deleted = 0', [stage_id]);
    const dealCount = deals[0].count;

    if (dealCount > 0) {
      if (!transfer_stage_id) {
        return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_76f51a1d') : "Cannot delete stage with active deals. Please provide transfer_stage_id to reassign deals.", requires_transfer: true, deal_count: dealCount });
      }

      // Reassign deals
      await pool.execute('UPDATE deals SET stage_id = ? WHERE stage_id = ?', [transfer_stage_id, stage_id]);
    }

    const [result] = await pool.execute(
      'UPDATE deal_pipeline_stages SET is_deleted = 1 WHERE id = ? AND pipeline_id = ?',
      [stage_id, pipeline_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_23effa10') : "Stage not found" });
    res.json({ success: true, data: { id: stage_id, deleted: true } });
  } catch (err) {
    console.error('Deal stage delete:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_0f2fa2fa') : "Failed to delete stage" });
  }
};

const reorderStages = async (req, res) => {
  try {
    const { pipeline_id } = req.params;
    const { stages } = req.body; // Array of { id, display_order }

    if (!Array.isArray(stages)) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_7ea94c4a') : "stages array is required" });
    }

    const queries = stages.map(s =>
      pool.execute('UPDATE deal_pipeline_stages SET display_order = ? WHERE id = ? AND pipeline_id = ?', [s.display_order, s.id, pipeline_id])
    );

    await Promise.all(queries);

    res.json({ success: true, message: req.t ? req.t('api_msg_a0732ce3') : "Stages reordered successfully" });
  } catch (err) {
    console.error('Deal stage reorder:', err);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_64c343c3') : "Failed to reorder stages" });
  }
};

module.exports = {
  getAllPipelines,
  createPipeline,
  updatePipeline,
  deletePipeline,
  getStagesByPipelineId,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
};
