// =====================================================
// Notification Settings Controller
// Handles all notification settings CRUD operations
// =====================================================

const pool = require('../config/db');

/**
 * Ensure notification_settings table exists
 */
const ensureTableExists = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        event_key VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        notify_to JSON DEFAULT NULL COMMENT 'Array of user IDs or roles to notify',
        enable_email TINYINT(1) DEFAULT 0,
        enable_web TINYINT(1) DEFAULT 1,
        enable_slack TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_company_event (company_id, event_key),
        INDEX idx_company (company_id),
        INDEX idx_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    // Check if default data exists for company
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM notification_settings WHERE company_id = 1'
    );
    
    if (rows[0].count === 0) {
      // Insert default notification settings
      await createDefaultNotifications(1);
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring notification_settings table exists:', error);
    return false;
  }
};

/**
 * Create default notification settings for a company
 */
const createDefaultNotifications = async (companyId) => {
  const defaultNotifications = [
    // Contract
    { event_name: 'Contract accepted', event_key: 'contract_accepted', category: 'Contract', notify_to: '["admin"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Contract rejected', event_key: 'contract_rejected', category: 'Contract', notify_to: '["admin"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Contract sent', event_key: 'contract_sent', category: 'Contract', notify_to: '["client"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    
    // Estimate
    { event_name: 'Estimate sent', event_key: 'estimate_sent', category: 'Estimate', notify_to: '["client"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Estimate accepted', event_key: 'estimate_accepted', category: 'Estimate', notify_to: '["admin"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Estimate rejected', event_key: 'estimate_rejected', category: 'Estimate', notify_to: '["admin"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Estimate request received', event_key: 'estimate_request_received', category: 'Estimate', notify_to: '["admin"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Estimate commented', event_key: 'estimate_commented', category: 'Estimate', notify_to: '["admin", "client"]', enable_email: 0, enable_web: 1, enable_slack: 0 },
    
    // Event
    { event_name: 'Upcoming event', event_key: 'upcoming_event', category: 'Event', notify_to: '["assigned"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    
    // Invoice
    { event_name: 'Send invoice', event_key: 'send_invoice', category: 'Invoice', notify_to: '["client"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Invoice payment confirmation', event_key: 'invoice_payment_confirmation', category: 'Invoice', notify_to: '["admin", "client"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Invoice due reminder before due date', event_key: 'invoice_due_reminder', category: 'Invoice', notify_to: '["client"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Invoice overdue reminder', event_key: 'invoice_overdue_reminder', category: 'Invoice', notify_to: '["client"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Recurring invoice creation reminder', event_key: 'recurring_invoice_reminder', category: 'Invoice', notify_to: '["admin"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Invoice manual payment added', event_key: 'invoice_manual_payment', category: 'Invoice', notify_to: '["admin", "client"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Send credit note', event_key: 'send_credit_note', category: 'Invoice', notify_to: '["client"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    
    // Message
    { event_name: 'Message received', event_key: 'message_received', category: 'Message', notify_to: '["recipient"]', enable_email: 0, enable_web: 1, enable_slack: 0 },
    
    // Order
    { event_name: 'New order received', event_key: 'new_order_received', category: 'Order', notify_to: '["admin"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Order status updated', event_key: 'order_status_updated', category: 'Order', notify_to: '["client"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    
    // Project
    { event_name: 'Project completed', event_key: 'project_completed', category: 'Project', notify_to: '["admin", "client"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Project task deadline reminder', event_key: 'project_task_deadline', category: 'Project', notify_to: '["assigned"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    
    // Proposal
    { event_name: 'Proposal sent', event_key: 'proposal_sent', category: 'Proposal', notify_to: '["client"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Proposal accepted', event_key: 'proposal_accepted', category: 'Proposal', notify_to: '["admin"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Proposal rejected', event_key: 'proposal_rejected', category: 'Proposal', notify_to: '["admin"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Proposal commented', event_key: 'proposal_commented', category: 'Proposal', notify_to: '["admin", "client"]', enable_email: 0, enable_web: 1, enable_slack: 0 },
    
    // Reminder
    { event_name: 'Upcoming reminder', event_key: 'upcoming_reminder', category: 'Reminder', notify_to: '["assigned"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    
    // Task
    { event_name: 'Task commented', event_key: 'task_commented', category: 'Task', notify_to: '["assigned", "admin"]', enable_email: 0, enable_web: 1, enable_slack: 0 },
    { event_name: 'Task assigned', event_key: 'task_assigned', category: 'Task', notify_to: '["assigned"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Task general', event_key: 'task_general', category: 'Task', notify_to: '["assigned"]', enable_email: 0, enable_web: 1, enable_slack: 0 },
    
    // Ticket
    { event_name: 'Ticket created', event_key: 'ticket_created', category: 'Ticket', notify_to: '["admin"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Ticket commented', event_key: 'ticket_commented', category: 'Ticket', notify_to: '["assigned", "client"]', enable_email: 0, enable_web: 1, enable_slack: 0 },
    { event_name: 'Ticket closed', event_key: 'ticket_closed', category: 'Ticket', notify_to: '["client"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    { event_name: 'Ticket reopened', event_key: 'ticket_reopened', category: 'Ticket', notify_to: '["admin"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
    
    // Client
    { event_name: 'New client added', event_key: 'client_added', category: 'Client', notify_to: '["admin"]', enable_email: 0, enable_web: 1, enable_slack: 0 },
    { event_name: 'Client updated', event_key: 'client_updated', category: 'Client', notify_to: '["admin"]', enable_email: 0, enable_web: 1, enable_slack: 0 },
    
    // Announcement
    { event_name: 'New announcement', event_key: 'announcement_created', category: 'Announcement', notify_to: '["all"]', enable_email: 1, enable_web: 1, enable_slack: 0 },
  ];

  for (const notification of defaultNotifications) {
    try {
      await pool.execute(
        `INSERT INTO notification_settings 
         (company_id, event_name, event_key, category, notify_to, enable_email, enable_web, enable_slack) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE event_name = event_name`,
        [
          companyId,
          notification.event_name,
          notification.event_key,
          notification.category,
          notification.notify_to,
          notification.enable_email,
          notification.enable_web,
          notification.enable_slack
        ]
      );
    } catch (error) {
      console.error(`Error creating notification ${notification.event_key}:`, error);
    }
  }
};

/**
 * Get all notification settings
 * GET /api/v1/notification-settings
 */
const getAll = async (req, res) => {
  try {
    await ensureTableExists();
    
    const companyId = req.query.company_id || req.body.company_id;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }

    // Check if company has any notification settings
    const [checkRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM notification_settings WHERE company_id = ?',
      [companyId]
    );

    // If no settings exist, create defaults
    if (checkRows[0].count === 0) {
      await createDefaultNotifications(companyId);
    }

    let query = `
      SELECT 
        id, company_id, event_name, event_key, category, 
        notify_to, enable_email, enable_web, enable_slack, 
        is_active, created_at, updated_at
      FROM notification_settings
      WHERE company_id = ?
    `;

    const params = [companyId];

    // Filter by category if provided
    if (req.query.category) {
      query += ' AND category = ?';
      params.push(req.query.category);
    }

    // Filter by search term
    if (req.query.search) {
      query += ' AND (event_name LIKE ? OR category LIKE ?)';
      const searchTerm = `%${req.query.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY category, event_name';

    const [rows] = await pool.execute(query, params);

    // Parse notify_to JSON
    const notifications = rows.map(row => ({
      ...row,
      notify_to: typeof row.notify_to === 'string' ? JSON.parse(row.notify_to || '[]') : row.notify_to,
      enable_email: Boolean(row.enable_email),
      enable_web: Boolean(row.enable_web),
      enable_slack: Boolean(row.enable_slack),
      is_active: Boolean(row.is_active),
    }));

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_a77ec532') : "Failed to get notification settings"
    });
  }
};

/**
 * Get single notification setting
 * GET /api/v1/notification-settings/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.company_id || req.body.company_id;

    const [rows] = await pool.execute(
      `SELECT * FROM notification_settings WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_058f1d6c') : "Notification setting not found"
      });
    }

    const notification = {
      ...rows[0],
      notify_to: typeof rows[0].notify_to === 'string' ? JSON.parse(rows[0].notify_to || '[]') : rows[0].notify_to,
      enable_email: Boolean(rows[0].enable_email),
      enable_web: Boolean(rows[0].enable_web),
      enable_slack: Boolean(rows[0].enable_slack),
      is_active: Boolean(rows[0].is_active),
    };

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Get notification setting error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_498b765b') : "Failed to get notification setting"
    });
  }
};

/**
 * Update notification setting
 * PUT /api/v1/notification-settings/:id
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.company_id || req.body.company_id;
    const { notify_to, enable_email, enable_web, enable_slack, is_active } = req.body;

    // Check if notification exists
    const [existing] = await pool.execute(
      'SELECT * FROM notification_settings WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_058f1d6c') : "Notification setting not found"
      });
    }

    // Prepare update fields
    const updateFields = [];
    const updateValues = [];

    if (notify_to !== undefined) {
      updateFields.push('notify_to = ?');
      updateValues.push(JSON.stringify(notify_to));
    }
    if (enable_email !== undefined) {
      updateFields.push('enable_email = ?');
      updateValues.push(enable_email ? 1 : 0);
    }
    if (enable_web !== undefined) {
      updateFields.push('enable_web = ?');
      updateValues.push(enable_web ? 1 : 0);
    }
    if (enable_slack !== undefined) {
      updateFields.push('enable_slack = ?');
      updateValues.push(enable_slack ? 1 : 0);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_003199ed') : "No fields to update"
      });
    }

    updateValues.push(id, companyId);

    await pool.execute(
      `UPDATE notification_settings SET ${updateFields.join(', ')} WHERE id = ? AND company_id = ?`,
      updateValues
    );

    // Get updated notification
    const [rows] = await pool.execute(
      'SELECT * FROM notification_settings WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    const notification = {
      ...rows[0],
      notify_to: typeof rows[0].notify_to === 'string' ? JSON.parse(rows[0].notify_to || '[]') : rows[0].notify_to,
      enable_email: Boolean(rows[0].enable_email),
      enable_web: Boolean(rows[0].enable_web),
      enable_slack: Boolean(rows[0].enable_slack),
      is_active: Boolean(rows[0].is_active),
    };

    res.json({
      success: true,
      data: notification,
      message: req.t ? req.t('api_msg_1bc8e848') : "Notification setting updated successfully"
    });
  } catch (error) {
    console.error('Update notification setting error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_8f597a12') : "Failed to update notification setting"
    });
  }
};

/**
 * Get unique categories
 * GET /api/v1/notification-settings/categories
 */
const getCategories = async (req, res) => {
  try {
    await ensureTableExists();
    
    const companyId = req.query.company_id || req.body.company_id;

    const [rows] = await pool.execute(
      `SELECT DISTINCT category FROM notification_settings WHERE company_id = ? ORDER BY category`,
      [companyId]
    );

    const categories = rows.map(row => row.category);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_5ec59b4e') : "Failed to get categories"
    });
  }
};

module.exports = {
  getAll,
  getById,
  update,
  getCategories,
  ensureTableExists,
  createDefaultNotifications
};

