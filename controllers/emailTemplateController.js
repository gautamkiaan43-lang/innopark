// =====================================================
// Email Template Controller
// =====================================================

const pool = require('../config/db');

/**
 * Ensure email_templates table exists with all required columns
 */
const ensureTableExists = async () => {
  try {
    // Create table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        body LONGTEXT NOT NULL,
        type VARCHAR(100) DEFAULT NULL,
        template_key VARCHAR(100) DEFAULT NULL COMMENT 'Template key (e.g., contract_sent, invoice_sent)',
        category VARCHAR(100) DEFAULT NULL COMMENT 'Template category (e.g., Contract, Invoice, Proposal)',
        is_active TINYINT(1) DEFAULT 1 COMMENT 'Whether template is active',
        is_deleted TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_company_id (company_id),
        INDEX idx_type (type),
        INDEX idx_template_key (template_key),
        INDEX idx_category (category),
        INDEX idx_is_deleted (is_deleted)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Check and add columns if they don't exist
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'email_templates'
    `);
    
    const columnNames = columns.map(col => col.COLUMN_NAME);

    if (!columnNames.includes('type')) {
      await pool.execute(`
        ALTER TABLE email_templates 
        ADD COLUMN type VARCHAR(100) DEFAULT NULL 
        AFTER body
      `);
    }

    if (!columnNames.includes('template_key')) {
      await pool.execute(`
        ALTER TABLE email_templates 
        ADD COLUMN template_key VARCHAR(100) DEFAULT NULL 
        COMMENT 'Template key (e.g., contract_sent, invoice_sent)' 
        AFTER type
      `);
    }

    if (!columnNames.includes('category')) {
      await pool.execute(`
        ALTER TABLE email_templates 
        ADD COLUMN category VARCHAR(100) DEFAULT NULL 
        COMMENT 'Template category (e.g., Contract, Invoice, Proposal)' 
        AFTER template_key
      `);
    }

    if (!columnNames.includes('is_active')) {
      await pool.execute(`
        ALTER TABLE email_templates 
        ADD COLUMN is_active TINYINT(1) DEFAULT 1 
        COMMENT 'Whether template is active' 
        AFTER category
      `);
    }

    // Add indexes if they don't exist
    try {
      await pool.execute(`CREATE INDEX idx_template_key ON email_templates (template_key)`);
    } catch (e) {
      // Index might already exist
    }

    try {
      await pool.execute(`CREATE INDEX idx_category ON email_templates (category)`);
    } catch (e) {
      // Index might already exist
    }

    return true;
  } catch (error) {
    console.error('Error ensuring email_templates table:', error);
    return false;
  }
};

const getAll = async (req, res) => {
  // Ensure table exists
  await ensureTableExists();
  try {
    // Only filter by company_id if explicitly provided in query params or req.companyId exists
    const filterCompanyId = req.query.company_id || req.body.company_id || 1;
    const category = req.query.category;
    
    let whereClause = 'WHERE e.is_deleted = 0';
    const params = [];
    
    if (filterCompanyId) {
      whereClause += ' AND e.company_id = ?';
      params.push(filterCompanyId);
    }
    
    if (category) {
      whereClause += ' AND e.type = ?';
      params.push(category);
    }

    // Get all templates without pagination
    const [templates] = await pool.execute(
      `SELECT 
        e.id,
        e.company_id,
        e.name,
        e.subject,
        e.body,
        e.type,
        e.created_at,
        e.updated_at,
        comp.name as company_name
       FROM email_templates e
       LEFT JOIN companies comp ON e.company_id = comp.id
       ${whereClause}
       ORDER BY e.created_at DESC`,
      params
    );

    // Extract merge tags from body
    const templatesWithTags = templates.map(template => {
      const mergeTags = [];
      const tagRegex = /\{\{(\w+)\}\}/g;
      let match;
      while ((match = tagRegex.exec(template.body)) !== null) {
        if (!mergeTags.includes(`{{${match[1]}}}`)) {
          mergeTags.push(`{{${match[1]}}}`);
        }
      }
      return {
        ...template,
        mergeTags
      };
    });

    res.json({ 
      success: true, 
      data: templatesWithTags
    });
  } catch (error) {
    console.error('Get email templates error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch email templates' 
    });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [templates] = await pool.execute(
      `SELECT 
        e.*,
        comp.name as company_name
       FROM email_templates e
       LEFT JOIN companies comp ON e.company_id = comp.id
       WHERE e.id = ? AND e.is_deleted = 0`,
      [id]
    );
    
    if (templates.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: req.t ? req.t('api_msg_303e8066') : "Email template not found" 
      });
    }

    const template = templates[0];
    
    // Extract merge tags
    const mergeTags = [];
    const tagRegex = /\{\{(\w+)\}\}/g;
    let match;
    while ((match = tagRegex.exec(template.body)) !== null) {
      if (!mergeTags.includes(`{{${match[1]}}}`)) {
        mergeTags.push(`{{${match[1]}}}`);
      }
    }
    template.mergeTags = mergeTags;

    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Get email template error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch email template' 
    });
  }
};

const create = async (req, res) => {
  try {
    const {
      company_id,
      name,
      subject,
      body,
      type,
      template_key,
      category
    } = req.body;

    // Validation
    if (!name || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_334184e7') : "name, subject, and body are required"
      });
    }

    const companyId = company_id || req.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }

    // Handle template_key - generate unique key if not provided to avoid NULL constraint issues
    let finalTemplateKey = template_key || null;
    if (!finalTemplateKey) {
      // Generate a unique template_key based on name and timestamp to avoid NULL conflicts
      const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 50);
      const timestamp = Date.now();
      finalTemplateKey = `${sanitizedName}_${timestamp}`;
    }

    // Check for duplicate template_key for this company (if unique constraint exists)
    if (finalTemplateKey) {
      const [existing] = await pool.execute(
        `SELECT id FROM email_templates 
         WHERE company_id = ? AND template_key = ? AND is_deleted = 0`,
        [companyId, finalTemplateKey]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: `A template with key '${finalTemplateKey}' already exists for this company`
        });
      }
    }

    // Insert template
    const [result] = await pool.execute(
      `INSERT INTO email_templates (
        company_id, name, subject, body, type, template_key, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        name,
        subject,
        body,
        type || null,
        finalTemplateKey,
        category || null
      ]
    );

    const templateId = result.insertId;

    // Get created template
    const [templates] = await pool.execute(
      `SELECT 
        e.*,
        comp.name as company_name
       FROM email_templates e
       LEFT JOIN companies comp ON e.company_id = comp.id
       WHERE e.id = ?`,
      [templateId]
    );

    const template = templates[0];
    
    // Extract merge tags
    const mergeTags = [];
    const tagRegex = /\{\{(\w+)\}\}/g;
    let match;
    while ((match = tagRegex.exec(template.body)) !== null) {
      if (!mergeTags.includes(`{{${match[1]}}}`)) {
        mergeTags.push(`{{${match[1]}}}`);
      }
    }
    template.mergeTags = mergeTags;

    res.status(201).json({ 
      success: true, 
      data: template,
      message: req.t ? req.t('api_msg_561ad677') : "Email template created successfully" 
    });
  } catch (error) {
    console.error('Create email template error:', error);
    
    // Handle duplicate key error specifically
    if (error.code === 'ER_DUP_ENTRY' || error.message.includes('uq_company_template_key')) {
      return res.status(409).json({
        success: false,
        error: 'A template with the same key already exists for this company. Please use a different template key or update the existing template.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create email template' 
    });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      subject,
      body,
      type
    } = req.body;

    // Check if template exists
    const [existing] = await pool.execute(
      `SELECT id FROM email_templates WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_303e8066') : "Email template not found"
      });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (subject !== undefined) {
      updates.push('subject = ?');
      values.push(subject);
    }
    if (body !== undefined) {
      updates.push('body = ?');
      values.push(body);
    }
    if (type !== undefined) {
      updates.push('type = ?');
      values.push(type || null);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      await pool.execute(
        `UPDATE email_templates SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    // Get updated template
    const [templates] = await pool.execute(
      `SELECT 
        e.*,
        comp.name as company_name
       FROM email_templates e
       LEFT JOIN companies comp ON e.company_id = comp.id
       WHERE e.id = ?`,
      [id]
    );

    const template = templates[0];
    
    // Extract merge tags
    const mergeTags = [];
    const tagRegex = /\{\{(\w+)\}\}/g;
    let match;
    while ((match = tagRegex.exec(template.body)) !== null) {
      if (!mergeTags.includes(`{{${match[1]}}}`)) {
        mergeTags.push(`{{${match[1]}}}`);
      }
    }
    template.mergeTags = mergeTags;

    res.json({
      success: true,
      data: template,
      message: req.t ? req.t('api_msg_9f361f48') : "Email template updated successfully"
    });
  } catch (error) {
    console.error('Update email template error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update email template' 
    });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.execute(
      `UPDATE email_templates 
       SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_303e8066') : "Email template not found"
      });
    }
    
    res.json({ 
      success: true, 
      message: req.t ? req.t('api_msg_a9ca92a1') : "Email template deleted successfully" 
    });
  } catch (error) {
    console.error('Delete email template error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete email template' 
    });
  }
};

/**
 * Get template by template_key
 * GET /api/v1/email-templates/key/:template_key
 */
const getByTemplateKey = async (req, res) => {
  try {
    const { template_key } = req.params;
    const company_id = req.query.company_id || req.body.company_id || 1;
    
    const [templates] = await pool.execute(
      `SELECT * FROM email_templates 
       WHERE template_key = ? 
       AND company_id = ? 
       AND is_deleted = 0 
       AND is_active = 1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [template_key, company_id]
    );
    
    if (templates.length === 0) {
      // Return 200 with success: false instead of 404 for graceful handling
      return res.status(200).json({ 
        success: false, 
        error: `Email template with key '${template_key}' not found`,
        data: null
      });
    }
    
    const template = templates[0];
    
    // Extract merge tags (support both {KEY} and {{KEY}} formats)
    const mergeTags = [];
    const tagRegex = /\{(\w+)\}/g;
    let match;
    while ((match = tagRegex.exec(template.body)) !== null) {
      if (!mergeTags.includes(`{${match[1]}}`)) {
        mergeTags.push(`{${match[1]}}`);
      }
    }
    template.mergeTags = mergeTags;
    
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Get email template by key error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch email template' 
    });
  }
};

module.exports = { 
  getAll, 
  getById, 
  getByTemplateKey,
  create, 
  update, 
  delete: deleteTemplate
};

