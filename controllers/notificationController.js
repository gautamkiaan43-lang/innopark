// =====================================================
// Notification Controller
// =====================================================

const pool = require('../config/db');

/**
 * Ensure notifications table exists
 */
const ensureTableExists = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        company_id INT NULL,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(500) NULL,
        related_entity_type VARCHAR(50) NULL,
        related_entity_id INT NULL,
        is_read TINYINT(1) DEFAULT 0,
        read_at DATETIME NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) DEFAULT 0,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_is_read (is_read),
        INDEX idx_type (type),
        INDEX idx_company_id (company_id),
        INDEX idx_created_at (created_at),
        INDEX idx_is_deleted (is_deleted)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    return true;
  } catch (error) {
    console.error('Error ensuring notifications table exists:', error);
    return false;
  }
};

/**
 * Get all notifications
 * GET /api/v1/notifications
 */
const getAll = async (req, res) => {
  // Ensure table exists before querying
  await ensureTableExists();
  try {
    console.log('=== GET ALL NOTIFICATIONS ===');
    console.log('Query params:', req.query);
    
    // No pagination - return all notifications
    const userId = req.query.user_id || req.body.user_id || 1;
    const is_read = req.query.is_read;
    const type = req.query.type;

    // Check if related_entity columns exist
    let hasRelatedEntityColumns = false;
    try {
      const [columns] = await pool.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'notifications' 
         AND (COLUMN_NAME = 'related_entity_type' OR COLUMN_NAME = 'related_entity_id')`
      );
      hasRelatedEntityColumns = columns.length >= 2;
      console.log('Has related_entity columns:', hasRelatedEntityColumns);
    } catch (e) {
      console.warn('Error checking columns:', e.message);
    }

    let whereClause = 'WHERE n.is_deleted = 0';
    const params = [];

    // Add user_id filter only if provided
    if (userId) {
      whereClause += ' AND n.user_id = ?';
      params.push(userId);
    }

    if (is_read !== undefined) {
      whereClause += ' AND n.is_read = ?';
      params.push(is_read === 'true' ? 1 : 0);
    }

    if (type) {
      whereClause += ' AND n.type = ?';
      params.push(type);
    }

    // Filter by related entity if provided and columns exist
    if (hasRelatedEntityColumns) {
      if (req.query.related_entity_type) {
        whereClause += ' AND n.related_entity_type = ?';
        params.push(req.query.related_entity_type);
      }

      if (req.query.related_entity_id) {
        whereClause += ' AND n.related_entity_id = ?';
        params.push(parseInt(req.query.related_entity_id));
      }
    }

    // Filter by company_id if provided
    if (req.query.company_id) {
      whereClause += ' AND n.company_id = ?';
      params.push(req.query.company_id);
    }

    console.log('SQL Query:', `SELECT n.*, u.name as created_by_name FROM notifications n LEFT JOIN users u ON n.created_by = u.id ${whereClause} ORDER BY n.created_at DESC`);
    // Note: The actual query uses 'users' table, not 'user'
    console.log('Params:', params);

    // Get all notifications without pagination
    const [notifications] = await pool.execute(
      `SELECT n.*, u.name as created_by_name
       FROM notifications n
       LEFT JOIN users u ON n.created_by = u.id
       ${whereClause}
       ORDER BY n.created_at DESC`,
      params
    );

    console.log('Notifications found:', notifications.length);

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    console.error('Error details:', error.sqlMessage || error.message);
    console.error('Error stack:', error.stack);
    
    // If error is due to missing columns, return empty array instead of error
    if (error.sqlMessage && (error.sqlMessage.includes('Unknown column') || error.sqlMessage.includes('related_entity'))) {
      console.warn('Missing related_entity columns, returning empty array');
      return res.json({
        success: true,
        data: []
      });
    }
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_ad1303b7') : "Failed to fetch notifications",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get notification by ID
 * GET /api/v1/notifications/:id
 */
const getById = async (req, res) => {
  // Ensure table exists before querying
  await ensureTableExists();
  try {
    const { id } = req.params;
    const userId = req.query.user_id || req.body.user_id || 1;

    const [notifications] = await pool.execute(
      `SELECT n.*, u.name as created_by_name
       FROM notifications n
       LEFT JOIN users u ON n.created_by = u.id
       WHERE n.id = ? AND n.is_deleted = 0`,
      [id]
    );

    if (notifications.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_fffdaac8') : "Notification not found"
      });
    }

    // Mark as read when viewing
    await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: notifications[0]
    });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_b4ebef96') : "Failed to fetch notification"
    });
  }
};

/**
 * Create notification
 * POST /api/v1/notifications
 */
const create = async (req, res) => {
  // Ensure table exists before inserting
  await ensureTableExists();
  try {
    const {
      user_id,
      type,
      title,
      message,
      link,
      related_entity_type,
      related_entity_id
    } = req.body;

    if (!user_id || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_d4ba21c6') : "User ID, type, title, and message are required"
      });
    }

    let companyId = req.body.company_id || req.query.company_id || null;
    const createdBy = req.body.created_by || req.body.user_id || req.query.user_id || user_id;

    // Validate user_id exists
    try {
      const [userCheck] = await pool.execute(
        'SELECT id FROM users WHERE id = ?',
        [user_id]
      );
      if (userCheck.length === 0) {
        return res.status(400).json({
          success: false,
          error: `User ID ${user_id} does not exist`
        });
      }
    } catch (err) {
      console.error('User validation error:', err);
      // Continue anyway - might be a permissions issue
    }

    // Validate company_id if provided
    if (companyId) {
      try {
        const [companyCheck] = await pool.execute(
          'SELECT id FROM companies WHERE id = ?',
          [companyId]
        );
        if (companyCheck.length === 0) {
          console.warn(`Company ID ${companyId} does not exist, setting to NULL`);
          companyId = null;
        }
      } catch (err) {
        console.error('Company validation error:', err);
        // Continue with null company_id
        companyId = null;
      }
    }

    // Check if related_entity columns exist
    let hasRelatedEntityColumns = false;
    try {
      const [columns] = await pool.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'notifications' 
         AND (COLUMN_NAME = 'related_entity_type' OR COLUMN_NAME = 'related_entity_id')`
      );
      hasRelatedEntityColumns = columns.length >= 2;
    } catch (e) {
      console.warn('Error checking columns:', e.message);
    }

    let insertFields = 'company_id, user_id, type, title, message, link';
    let insertValues = [companyId || null, user_id, type, title, message, link || null];
    let placeholders = '?, ?, ?, ?, ?, ?';

    if (hasRelatedEntityColumns) {
      insertFields += ', related_entity_type, related_entity_id';
      insertValues.push(related_entity_type || null, related_entity_id || null);
      placeholders += ', ?, ?';
    }

    // Add created_at at the end
    insertFields += ', created_at';
    placeholders += ', NOW()';

    console.log('=== CREATE NOTIFICATION ===');
    console.log('Insert fields:', insertFields);
    console.log('Insert values:', insertValues);
    console.log('Has related_entity columns:', hasRelatedEntityColumns);

    const [result] = await pool.execute(
      `INSERT INTO notifications (${insertFields}) VALUES (${placeholders})`,
      insertValues
    );

    const [newNotification] = await pool.execute(
      'SELECT * FROM notifications WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: newNotification[0],
      message: req.t ? req.t('api_msg_88803c4b') : "Notification created successfully"
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_1417bd25') : "Failed to create notification",
      details: error.message || 'Unknown error',
      sqlMessage: error.sqlMessage || null
    });
  }
};

/**
 * Mark notification as read
 * PUT /api/v1/notifications/:id/read
 */
const markAsRead = async (req, res) => {
  // Ensure table exists before updating
  await ensureTableExists();
  try {
    const { id } = req.params;
    const userId = req.query.user_id || req.body.user_id || 1;

    const [result] = await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_fffdaac8') : "Notification not found"
      });
    }

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_854759ca') : "Notification marked as read"
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_ffe7d139') : "Failed to mark notification as read"
    });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/v1/notifications/mark-all-read
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.query.user_id || req.body.user_id || 1;

    await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_0153277d') : "All notifications marked as read"
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_8b9f1f86') : "Failed to mark all notifications as read"
    });
  }
};

/**
 * Delete notification (soft delete)
 * DELETE /api/v1/notifications/:id
 */
const deleteNotification = async (req, res) => {
  // Ensure table exists before deleting
  await ensureTableExists();
  try {
    const { id } = req.params;
    const userId = req.query.user_id || req.body.user_id || 1;

    const [result] = await pool.execute(
      'UPDATE notifications SET is_deleted = 1 WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_fffdaac8') : "Notification not found"
      });
    }

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_d0ff8753') : "Notification deleted successfully"
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_7d136019') : "Failed to delete notification"
    });
  }
};

/**
 * Get unread count
 * GET /api/v1/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.query.user_id || req.body.user_id || 1;

    const [result] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0 AND is_deleted = 0',
      [userId]
    );

    res.json({
      success: true,
      data: {
        unread_count: result[0].count
      }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_b1cc42fa') : "Failed to get unread count"
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  markAsRead,
  markAllAsRead,
  delete: deleteNotification,
  getUnreadCount
};

