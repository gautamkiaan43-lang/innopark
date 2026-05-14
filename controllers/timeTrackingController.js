const pool = require('../config/db');

const getAll = async (req, res) => {
  try {
    const companyId = req.query.company_id || req.body.company_id || req.companyId;
    const userId = req.query.user_id || req.body.user_id;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }
    
    let whereClause = 'WHERE tl.company_id = ? AND tl.is_deleted = 0 AND u.is_deleted = 0';
    const params = [companyId];
    
    // Filter by user_id if provided (for employee dashboard)
    if (userId) {
      whereClause += ' AND tl.user_id = ?';
      params.push(userId);
    }

    // Get all time logs without pagination
    const [timeLogs] = await pool.execute(
      `SELECT 
        tl.id,
        tl.company_id,
        tl.user_id,
        tl.project_id,
        tl.task_id,
        tl.hours,
        tl.date,
        tl.description,
        tl.created_at,
        tl.updated_at,
        u.name as employee_name,
        u.email as employee_email,
        p.project_name as project_name,
        t.title as task_title
      FROM time_logs tl
      JOIN users u ON tl.user_id = u.id
      LEFT JOIN projects p ON tl.project_id = p.id
      LEFT JOIN tasks t ON tl.task_id = t.id
      ${whereClause}
      ORDER BY tl.date DESC, u.name ASC`,
      params
    );
    res.json({ 
      success: true, 
      data: timeLogs
    });
  } catch (error) {
    console.error('Get time logs error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      companyId: req.companyId
    });
    res.status(500).json({ 
      success: false, 
      error: req.t ? req.t('api_msg_b1535188') : "Failed to fetch time logs",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const create = async (req, res) => {
  try {
    const { user_id, project_id, task_id, hours, date, description, company_id } = req.body;

    // Debug logging
    console.log('Time log create request body:', JSON.stringify(req.body, null, 2));

    // Get company_id from body, query, or middleware
    const companyId = company_id || req.query.company_id || req.companyId;

    // For admin, use provided user_id; for employees, use their own userId
    const userId = user_id || req.userId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }

    // More explicit validation
    const missingFields = [];
    if (userId === undefined || userId === null || userId === '') missingFields.push('user_id');
    if (project_id === undefined || project_id === null || project_id === '') missingFields.push('project_id');
    if (hours === undefined || hours === null || hours === '') missingFields.push('hours');
    if (date === undefined || date === null || date === '') missingFields.push('date');

    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields);
      console.log('Received values - user_id:', user_id, 'project_id:', project_id, 'hours:', hours, 'date:', date);
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO time_logs (company_id, user_id, project_id, task_id, hours, date, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [companyId, userId, project_id, task_id || null, hours, date, description || null]
    );
    
    // Fetch the created time log with all details
    const [timeLogs] = await pool.execute(
      `SELECT 
        tl.id,
        tl.company_id,
        tl.user_id,
        tl.project_id,
        tl.task_id,
        tl.hours,
        tl.date,
        tl.description,
        tl.created_at,
        u.name as employee_name,
        p.project_name as project_name,
        t.title as task_title
       FROM time_logs tl
       JOIN users u ON tl.user_id = u.id
       LEFT JOIN projects p ON tl.project_id = p.id
       LEFT JOIN tasks t ON tl.task_id = t.id
       WHERE tl.id = ?`,
      [result.insertId]
    );
    
    res.status(201).json({ 
      success: true, 
      data: timeLogs[0] || { id: result.insertId },
      message: req.t ? req.t('api_msg_1f081138') : "Time log created successfully"
    });
  } catch (error) {
    console.error('Create time log error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create time log' 
    });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id, task_id, hours, date, description, company_id, user_id } = req.body;
    
    // Get company_id from body, query, or middleware
    const companyId = company_id || req.query.company_id || req.companyId;
    const userId = user_id || req.query.user_id || req.userId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }
    
    // Check if time log exists and belongs to company
    const [existing] = await pool.execute(
      `SELECT id, user_id FROM time_logs WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, companyId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_7049fe6d') : "Time log not found"
      });
    }

    // For employees, only allow updating their own logs
    if (userId && existing[0].user_id !== parseInt(userId)) {
      // Allow update only if admin or own log
      const [userCheck] = await pool.execute(
        `SELECT role FROM users WHERE id = ?`,
        [userId]
      );
      if (userCheck.length > 0 && userCheck[0].role === 'EMPLOYEE') {
        return res.status(403).json({
          success: false,
          error: req.t ? req.t('api_msg_c8a0dcfc') : "You can only update your own time logs"
        });
      }
    }

    // Build update query
    const updates = [];
    const values = [];

    if (project_id !== undefined) {
      updates.push('project_id = ?');
      values.push(project_id);
    }
    if (task_id !== undefined) {
      updates.push('task_id = ?');
      values.push(task_id || null);
    }
    if (hours !== undefined) {
      updates.push('hours = ?');
      values.push(hours);
    }
    if (date !== undefined) {
      updates.push('date = ?');
      values.push(date);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_003199ed') : "No fields to update"
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await pool.execute(
      `UPDATE time_logs SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated time log
    const [timeLogs] = await pool.execute(
      `SELECT 
        tl.id,
        tl.company_id,
        tl.user_id,
        tl.project_id,
        tl.task_id,
        tl.hours,
        tl.date,
        tl.description,
        tl.created_at,
        tl.updated_at,
        u.name as employee_name,
        u.email as employee_email,
        p.project_name as project_name,
        t.title as task_title
       FROM time_logs tl
       JOIN users u ON tl.user_id = u.id
       LEFT JOIN projects p ON tl.project_id = p.id
       LEFT JOIN tasks t ON tl.task_id = t.id
       WHERE tl.id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: timeLogs[0],
      message: req.t ? req.t('api_msg_9595915b') : "Time log updated successfully"
    });
  } catch (error) {
    console.error('Update time log error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update time log'
    });
  }
};

const deleteTimeLog = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get company_id from query or body
    const companyId = req.query.company_id || req.body.company_id || req.companyId;
    const userId = req.query.user_id || req.body.user_id || req.userId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }
    
    // Check if time log exists
    const [existing] = await pool.execute(
      `SELECT id, user_id FROM time_logs WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, companyId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_7049fe6d') : "Time log not found"
      });
    }

    // For employees, only allow deleting their own logs
    if (userId && existing[0].user_id !== parseInt(userId)) {
      // Check if user is admin
      const [userCheck] = await pool.execute(
        `SELECT role FROM users WHERE id = ?`,
        [userId]
      );
      if (userCheck.length > 0 && userCheck[0].role === 'EMPLOYEE') {
        return res.status(403).json({
          success: false,
          error: req.t ? req.t('api_msg_da4b47ef') : "You can only delete your own time logs"
        });
      }
    }

    await pool.execute(
      `UPDATE time_logs SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_495023c9') : "Time log deleted successfully"
    });
  } catch (error) {
    console.error('Delete time log error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete time log'
    });
  }
};

/**
 * Get time log by ID
 * GET /api/v1/time-logs/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.company_id || req.body.company_id || req.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }
    
    const [timeLogs] = await pool.execute(
      `SELECT 
        tl.id,
        tl.company_id,
        tl.user_id,
        tl.project_id,
        tl.task_id,
        tl.hours,
        tl.date,
        tl.description,
        tl.created_at,
        tl.updated_at,
        u.name as employee_name,
        u.email as employee_email,
        p.project_name as project_name,
        t.title as task_title
       FROM time_logs tl
       JOIN users u ON tl.user_id = u.id
       LEFT JOIN projects p ON tl.project_id = p.id
       LEFT JOIN tasks t ON tl.task_id = t.id
       WHERE tl.id = ? AND tl.company_id = ? AND tl.is_deleted = 0`,
      [id, companyId]
    );
    
    if (timeLogs.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_7049fe6d') : "Time log not found"
      });
    }
    
    res.json({
      success: true,
      data: timeLogs[0]
    });
  } catch (error) {
    console.error('Get time log by ID error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_ead5045d') : "Failed to fetch time log"
    });
  }
};

/**
 * Get time log statistics for employee
 * GET /api/v1/time-logs/stats
 */
const getStats = async (req, res) => {
  try {
    const companyId = req.query.company_id || req.companyId;
    const userId = req.query.user_id || req.userId;
    
    if (!companyId || !userId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_6d05d6f9') : "company_id and user_id are required"
      });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    // Get stats
    const [todayHours] = await pool.execute(
      `SELECT COALESCE(SUM(hours), 0) as total FROM time_logs 
       WHERE user_id = ? AND company_id = ? AND date = ? AND is_deleted = 0`,
      [userId, companyId, today]
    );
    
    const [weekHours] = await pool.execute(
      `SELECT COALESCE(SUM(hours), 0) as total FROM time_logs 
       WHERE user_id = ? AND company_id = ? AND date >= ? AND is_deleted = 0`,
      [userId, companyId, weekAgo]
    );
    
    const [monthHours] = await pool.execute(
      `SELECT COALESCE(SUM(hours), 0) as total FROM time_logs 
       WHERE user_id = ? AND company_id = ? AND date >= ? AND is_deleted = 0`,
      [userId, companyId, monthStart]
    );
    
    const [totalEntries] = await pool.execute(
      `SELECT COUNT(*) as total FROM time_logs 
       WHERE user_id = ? AND company_id = ? AND is_deleted = 0`,
      [userId, companyId]
    );
    
    res.json({
      success: true,
      data: {
        today_hours: parseFloat(todayHours[0].total) || 0,
        week_hours: parseFloat(weekHours[0].total) || 0,
        month_hours: parseFloat(monthHours[0].total) || 0,
        total_entries: totalEntries[0].total || 0
      }
    });
  } catch (error) {
    console.error('Get time log stats error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_4940f8a1') : "Failed to fetch time log statistics"
    });
  }
};

module.exports = { getAll, getById, getStats, create, update, delete: deleteTimeLog };

