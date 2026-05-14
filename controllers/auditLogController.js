// =====================================================
// Audit Log Controller
// =====================================================

const pool = require('../config/db');

/**
 * Get all audit logs
 * GET /api/v1/audit-logs
 */
const getAll = async (req, res) => {
  try {
    // No pagination - return all audit logs
    const filterCompanyId = req.query.company_id || req.body.company_id || 1;
    const action = req.query.action;
    const user_id = req.query.user_id;
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;

    // Remove is_deleted check - column doesn't exist in audit_logs table
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (filterCompanyId) {
      whereClause += ' AND al.company_id = ?';
      params.push(filterCompanyId);
    }

    if (action) {
      whereClause += ' AND al.action = ?';
      params.push(action);
    }

    if (user_id) {
      whereClause += ' AND al.user_id = ?';
      params.push(user_id);
    }

    if (start_date) {
      whereClause += ' AND DATE(al.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND DATE(al.created_at) <= ?';
      params.push(end_date);
    }

    // Get all audit logs without pagination
    const [logs] = await pool.execute(
      `SELECT al.*, u.name as user_name, u.email as user_email, c.name as company_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       LEFT JOIN companies c ON al.company_id = c.id
       ${whereClause}
       ORDER BY al.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_112560c5') : "Failed to fetch audit logs"
    });
  }
};

/**
 * Get audit log by ID
 * GET /api/v1/audit-logs/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const filterCompanyId = req.query.company_id || req.body.company_id || 1;

    // Remove is_deleted check - column doesn't exist in audit_logs table
    let whereClause = 'WHERE al.id = ?';
    const params = [id];

    if (filterCompanyId) {
      whereClause += ' AND al.company_id = ?';
      params.push(filterCompanyId);
    }

    const [logs] = await pool.execute(
      `SELECT al.*, u.name as user_name, u.email as user_email, c.name as company_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       LEFT JOIN companies c ON al.company_id = c.id
       ${whereClause}`,
      params
    );

    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_0331e695') : "Audit log not found"
      });
    }

    res.json({
      success: true,
      data: logs[0]
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_dfdebfc7') : "Failed to fetch audit log"
    });
  }
};

/**
 * Create audit log (usually called internally)
 * POST /api/v1/audit-logs
 */
const create = async (req, res) => {
  try {
    const {
      action,
      entity_type,
      entity_id,
      old_values,
      new_values,
      ip_address,
      user_agent,
      description
    } = req.body;

    if (!action || !entity_type) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_f0a1d0e1') : "Action and entity type are required"
      });
    }

    const companyId = req.body.company_id || req.query.company_id || 1;
    const userId = req.body.user_id || req.query.user_id || null;

    const [result] = await pool.execute(
      `INSERT INTO audit_logs (
        company_id, user_id, action, entity_type, entity_id,
        old_values, new_values, ip_address, user_agent, description,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        companyId || null,
        userId || null,
        action,
        entity_type,
        entity_id || null,
        old_values ? JSON.stringify(old_values) : null,
        new_values ? JSON.stringify(new_values) : null,
        ip_address || null,
        user_agent || null,
        description || null
      ]
    );

    const [newLog] = await pool.execute(
      'SELECT * FROM audit_logs WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: newLog[0],
      message: req.t ? req.t('api_msg_16ee6a77') : "Audit log created successfully"
    });
  } catch (error) {
    console.error('Create audit log error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_d6b34aa6') : "Failed to create audit log"
    });
  }
};

module.exports = {
  getAll,
  getById,
  create
};

