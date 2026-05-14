// =====================================================
// Project Template Controller
// =====================================================

const pool = require('../config/db');

// Helper function to ensure table exists
const ensureTableExists = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS project_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        sub_category VARCHAR(100),
        summary TEXT,
        notes TEXT,
        allow_manual_time_logs TINYINT(1) DEFAULT 0,
        is_deleted TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_company_id (company_id),
        INDEX idx_is_deleted (is_deleted)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (error) {
    // Table might already exist, that's fine
    if (error.code !== 'ER_TABLE_EXISTS_ERROR') {
      console.error('Error creating project_templates table:', error.message);
    }
  }
};

const getAll = async (req, res) => {
  try {
    await ensureTableExists();
    
    const companyId = req.query.company_id || req.companyId;

    let whereClause = 'WHERE pt.is_deleted = 0';
    const params = [];

    if (companyId) {
      whereClause += ' AND pt.company_id = ?';
      params.push(companyId);
    }

    const [templates] = await pool.execute(
      `SELECT 
        pt.id,
        pt.company_id,
        pt.name,
        pt.category,
        pt.sub_category,
        pt.summary,
        pt.notes,
        pt.allow_manual_time_logs,
        pt.created_at,
        pt.updated_at,
        c.name as company_name
       FROM project_templates pt
       LEFT JOIN companies c ON pt.company_id = c.id
       ${whereClause}
       ORDER BY pt.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get project templates error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch project templates'
    });
  }
};

const getById = async (req, res) => {
  try {
    await ensureTableExists();
    
    const { id } = req.params;

    const [templates] = await pool.execute(
      `SELECT 
        pt.*,
        c.name as company_name
       FROM project_templates pt
       LEFT JOIN companies c ON pt.company_id = c.id
       WHERE pt.id = ? AND pt.is_deleted = 0`,
      [id]
    );

    if (templates.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_73dc375c') : "Project template not found"
      });
    }

    res.json({ success: true, data: templates[0] });
  } catch (error) {
    console.error('Get project template error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch project template'
    });
  }
};

const create = async (req, res) => {
  try {
    await ensureTableExists();
    
    const {
      company_id,
      name,
      category,
      sub_category,
      summary,
      notes,
      allow_manual_time_logs
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_df66def6') : "Project name is required"
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO project_templates 
       (company_id, name, category, sub_category, summary, notes, allow_manual_time_logs) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        company_id || null,
        name,
        category || null,
        sub_category || null,
        summary || null,
        notes || null,
        allow_manual_time_logs ? 1 : 0
      ]
    );

    const [newTemplate] = await pool.execute(
      `SELECT * FROM project_templates WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: req.t ? req.t('api_msg_c405deed') : "Project template created successfully",
      data: newTemplate[0]
    });
  } catch (error) {
    console.error('Create project template error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create project template'
    });
  }
};

const update = async (req, res) => {
  try {
    await ensureTableExists();
    
    const { id } = req.params;
    const {
      name,
      category,
      sub_category,
      summary,
      notes,
      allow_manual_time_logs
    } = req.body;

    // Check if template exists
    const [existing] = await pool.execute(
      `SELECT id FROM project_templates WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_73dc375c') : "Project template not found"
      });
    }

    await pool.execute(
      `UPDATE project_templates 
       SET name = ?, category = ?, sub_category = ?, summary = ?, notes = ?, allow_manual_time_logs = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        name,
        category || null,
        sub_category || null,
        summary || null,
        notes || null,
        allow_manual_time_logs ? 1 : 0,
        id
      ]
    );

    const [updatedTemplate] = await pool.execute(
      `SELECT * FROM project_templates WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_8bce983d') : "Project template updated successfully",
      data: updatedTemplate[0]
    });
  } catch (error) {
    console.error('Update project template error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update project template'
    });
  }
};

const remove = async (req, res) => {
  try {
    await ensureTableExists();
    
    const { id } = req.params;

    // Check if template exists
    const [existing] = await pool.execute(
      `SELECT id FROM project_templates WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_73dc375c') : "Project template not found"
      });
    }

    // Soft delete
    await pool.execute(
      `UPDATE project_templates SET is_deleted = 1, updated_at = NOW() WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_e0a4047f') : "Project template deleted successfully"
    });
  } catch (error) {
    console.error('Delete project template error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete project template'
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: remove
};
