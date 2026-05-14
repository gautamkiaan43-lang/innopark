const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const getAll = async (req, res) => {
  try {
    const userRole = req.user.role?.toUpperCase();
    let companyId = req.companyId;

    // SuperAdmin can specify company_id to see other companies
    if (userRole === 'SUPERADMIN' && (req.query.company_id || req.body.company_id)) {
      companyId = req.query.company_id || req.body.company_id;
    }
    
    const whereClause = 'WHERE company_id = ? AND is_deleted = 0';
    const params = [companyId];

    // Get all users without pagination
    const [users] = await pool.execute(
      `SELECT id, company_id, name, email, role, status FROM users
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );
    res.json({ 
      success: true, 
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_361fdbd8') : "Failed to fetch users" });
  }
};

const create = async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_ac80ff80') : "name, email, password, and role are required"
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      `SELECT id FROM users WHERE email = ? AND company_id = ?`,
      [email, req.companyId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_26c4a934') : "User with this email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      `INSERT INTO users (company_id, name, email, password, role, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.companyId ?? null, name, email, hashedPassword, role, status || 'Active']
    );

    // Get created user (without password)
    const [users] = await pool.execute(
      `SELECT id, company_id, name, email, role, status, created_at 
       FROM users WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({ 
      success: true, 
      data: users[0],
      message: req.t ? req.t('api_msg_30fae028') : "User created successfully"
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_8538c89b') : "Failed to create user" });
  }
};

/**
 * Reset user password
 * POST /api/v1/users/:id/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const [users] = await pool.execute(
      `SELECT id FROM users WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, req.companyId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_b846d114') : "User not found"
      });
    }

    // Generate new random password
    const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + '123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.execute(
      `UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [hashedPassword, id]
    );

    res.json({
      success: true,
      data: {
        newPassword: newPassword
      },
      message: req.t ? req.t('api_msg_b086e394') : "Password reset successfully"
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_d7d46abd') : "Failed to reset password"
    });
  }
};

module.exports = { getAll, create, resetPassword };

