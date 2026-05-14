// =====================================================
// Social Media Integration Controller
// =====================================================

const pool = require('../config/db');
const crypto = require('crypto');

// Encryption key (should be in environment variables in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!';
const ALGORITHM = 'aes-256-cbc';

// Encrypt sensitive data
const encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Decrypt sensitive data
const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

const getAll = async (req, res) => {
  try {
    // Only filter by company_id if explicitly provided in query params or req.companyId exists
    const filterCompanyId = req.query.company_id || req.body.company_id || 1;
    
    let whereClause = 'WHERE s.is_deleted = 0';
    const params = [];
    
    if (filterCompanyId) {
      whereClause += ' AND s.company_id = ?';
      params.push(filterCompanyId);
    }
    
    // Optional platform filter
    if (req.query.platform) {
      whereClause += ' AND s.platform = ?';
      params.push(req.query.platform);
    }
    
    // Optional status filter
    if (req.query.status) {
      whereClause += ' AND s.status = ?';
      params.push(req.query.status);
    }

    // Get all integrations without pagination
    const [integrations] = await pool.execute(
      `SELECT 
        s.id,
        s.company_id,
        s.platform,
        s.name,
        s.webhook_url,
        s.status,
        s.auto_create_lead,
        s.auto_assign_to,
        s.auto_email_template,
        s.auto_task_template,
        s.last_sync,
        s.leads_captured,
        s.created_at,
        s.updated_at,
        u.name as auto_assign_to_name,
        comp.name as company_name
       FROM social_media_integrations s
       LEFT JOIN users u ON s.auto_assign_to = u.id
       LEFT JOIN companies comp ON s.company_id = comp.id
       ${whereClause}
       ORDER BY s.created_at DESC`,
      params
    );

    // Don't return encrypted API keys/secrets in list
    const sanitizedIntegrations = integrations.map(integration => ({
      ...integration,
      api_key: integration.api_key ? '***' : null,
      api_secret: integration.api_secret ? '***' : null,
    }));

    res.json({ 
      success: true, 
      data: sanitizedIntegrations
    });
  } catch (error) {
    console.error('Get social media integrations error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch social media integrations' 
    });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [integrations] = await pool.execute(
      `SELECT 
        s.*,
        u.name as auto_assign_to_name,
        comp.name as company_name
       FROM social_media_integrations s
       LEFT JOIN users u ON s.auto_assign_to = u.id
       LEFT JOIN companies comp ON s.company_id = comp.id
       WHERE s.id = ? AND s.is_deleted = 0`,
      [id]
    );
    
    if (integrations.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: req.t ? req.t('api_msg_63f6c703') : "Social media integration not found" 
      });
    }

    const integration = integrations[0];
    
    // Decrypt API keys for viewing/editing
    if (integration.api_key && integration.api_key !== '***') {
      integration.api_key = decrypt(integration.api_key) || '';
    }
    if (integration.api_secret && integration.api_secret !== '***') {
      integration.api_secret = decrypt(integration.api_secret) || '';
    }

    res.json({ success: true, data: integration });
  } catch (error) {
    console.error('Get social media integration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch social media integration' 
    });
  }
};

const create = async (req, res) => {
  try {
    const {
      company_id,
      platform,
      name,
      api_key,
      api_secret,
      webhook_url,
      auto_create_lead,
      auto_assign_to,
      auto_email_template,
      auto_task_template
    } = req.body;

    // Validation
    if (!company_id || !platform || !name) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_b7af99d9') : "company_id, platform, and name are required"
      });
    }

    const companyId = company_id || req.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }

    // Check if integration already exists for this company and platform
    const [existing] = await pool.execute(
      `SELECT id FROM social_media_integrations 
       WHERE company_id = ? AND platform = ? AND is_deleted = 0`,
      [companyId, platform]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Integration for ${platform} already exists for this company`
      });
    }

    // Encrypt API keys
    const encryptedApiKey = api_key ? encrypt(api_key) : null;
    const encryptedApiSecret = api_secret ? encrypt(api_secret) : null;

    // Insert integration
    const [result] = await pool.execute(
      `INSERT INTO social_media_integrations (
        company_id, platform, name, api_key, api_secret, webhook_url,
        status, auto_create_lead, auto_assign_to, auto_email_template,
        auto_task_template, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        platform,
        name,
        encryptedApiKey,
        encryptedApiSecret,
        webhook_url || null,
        'Disconnected',
        auto_create_lead !== undefined ? (auto_create_lead ? 1 : 0) : 1,
        auto_assign_to || null,
        auto_email_template || null,
        auto_task_template || null,
        req.userId || null
      ]
    );

    const integrationId = result.insertId;

    // Get created integration
    const [integrations] = await pool.execute(
      `SELECT 
        s.*,
        u.name as auto_assign_to_name,
        comp.name as company_name
       FROM social_media_integrations s
       LEFT JOIN users u ON s.auto_assign_to = u.id
       LEFT JOIN companies comp ON s.company_id = comp.id
       WHERE s.id = ?`,
      [integrationId]
    );

    const integration = integrations[0];
    // Don't return encrypted data
    integration.api_key = integration.api_key ? '***' : null;
    integration.api_secret = integration.api_secret ? '***' : null;

    res.status(201).json({ 
      success: true, 
      data: integration,
      message: req.t ? req.t('api_msg_13766e05') : "Social media integration created successfully" 
    });
  } catch (error) {
    console.error('Create social media integration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create social media integration' 
    });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      platform,
      name,
      api_key,
      api_secret,
      webhook_url,
      status,
      auto_create_lead,
      auto_assign_to,
      auto_email_template,
      auto_task_template
    } = req.body;

    // Check if integration exists
    const [existing] = await pool.execute(
      `SELECT id FROM social_media_integrations WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_63f6c703') : "Social media integration not found"
      });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (platform !== undefined) {
      updates.push('platform = ?');
      values.push(platform);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (api_key !== undefined) {
      updates.push('api_key = ?');
      values.push(api_key ? encrypt(api_key) : null);
    }
    if (api_secret !== undefined) {
      updates.push('api_secret = ?');
      values.push(api_secret ? encrypt(api_secret) : null);
    }
    if (webhook_url !== undefined) {
      updates.push('webhook_url = ?');
      values.push(webhook_url || null);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (auto_create_lead !== undefined) {
      updates.push('auto_create_lead = ?');
      values.push(auto_create_lead ? 1 : 0);
    }
    if (auto_assign_to !== undefined) {
      updates.push('auto_assign_to = ?');
      values.push(auto_assign_to || null);
    }
    if (auto_email_template !== undefined) {
      updates.push('auto_email_template = ?');
      values.push(auto_email_template || null);
    }
    if (auto_task_template !== undefined) {
      updates.push('auto_task_template = ?');
      values.push(auto_task_template || null);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      await pool.execute(
        `UPDATE social_media_integrations SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    // Get updated integration
    const [integrations] = await pool.execute(
      `SELECT 
        s.*,
        u.name as auto_assign_to_name,
        comp.name as company_name
       FROM social_media_integrations s
       LEFT JOIN users u ON s.auto_assign_to = u.id
       LEFT JOIN companies comp ON s.company_id = comp.id
       WHERE s.id = ?`,
      [id]
    );

    const integration = integrations[0];
    // Don't return encrypted data
    integration.api_key = integration.api_key ? '***' : null;
    integration.api_secret = integration.api_secret ? '***' : null;

    res.json({
      success: true,
      data: integration,
      message: req.t ? req.t('api_msg_2b7499cd') : "Social media integration updated successfully"
    });
  } catch (error) {
    console.error('Update social media integration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update social media integration' 
    });
  }
};

const deleteIntegration = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.execute(
      `UPDATE social_media_integrations 
       SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_63f6c703') : "Social media integration not found"
      });
    }
    
    res.json({ 
      success: true, 
      message: req.t ? req.t('api_msg_8d9fbb25') : "Social media integration deleted successfully" 
    });
  } catch (error) {
    console.error('Delete social media integration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete social media integration' 
    });
  }
};

const connect = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.execute(
      `UPDATE social_media_integrations 
       SET status = 'Connected', 
           last_sync = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND is_deleted = 0`,
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_63f6c703') : "Social media integration not found"
      });
    }
    
    res.json({ 
      success: true, 
      message: req.t ? req.t('api_msg_68204ec9') : "Integration connected successfully" 
    });
  } catch (error) {
    console.error('Connect integration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to connect integration' 
    });
  }
};

const disconnect = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.execute(
      `UPDATE social_media_integrations 
       SET status = 'Disconnected',
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND is_deleted = 0`,
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_63f6c703') : "Social media integration not found"
      });
    }
    
    res.json({ 
      success: true, 
      message: req.t ? req.t('api_msg_cb92ad5c') : "Integration disconnected successfully" 
    });
  } catch (error) {
    console.error('Disconnect integration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to disconnect integration' 
    });
  }
};

module.exports = { 
  getAll, 
  getById, 
  create, 
  update, 
  delete: deleteIntegration,
  connect,
  disconnect
};

