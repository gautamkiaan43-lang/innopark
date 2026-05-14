/**
 * Settings Service Layer
 * Handles business logic for settings management
 */

const pool = require('../config/db');
const { validateSettings, sanitizeValue } = require('../utils/settingsValidator');

/**
 * Get all settings for a company
 */
const getAllSettings = async (companyId) => {
  try {
    const [settings] = await pool.execute(
      `SELECT * FROM system_settings 
       WHERE company_id = ? OR company_id IS NULL 
       ORDER BY setting_key, company_id ASC`,
      [companyId]
    );
    return settings;
  } catch (error) {
    throw new Error(`Failed to fetch settings: ${error.message}`);
  }
};

/**
 * Get settings by category
 */
const getSettingsByCategory = async (category, companyId) => {
  try {
    const [settings] = await pool.execute(
      `SELECT * FROM system_settings
       WHERE (company_id = ? OR company_id IS NULL)
       AND setting_key LIKE ?
       ORDER BY setting_key, company_id ASC`,
      [companyId, `${category}%`]
    );
    return settings;
  } catch (error) {
    throw new Error(`Failed to fetch settings by category: ${error.message}`);
  }
};

/**
 * Get a single setting value
 */
const getSetting = async (key, companyId) => {
  try {
    const [settings] = await pool.execute(
      `SELECT setting_value FROM system_settings
       WHERE setting_key = ? AND (company_id = ? OR company_id IS NULL)
       ORDER BY company_id DESC
       LIMIT 1`,
      [key, companyId]
    );

    if (settings.length > 0) {
      return settings[0].setting_value;
    }
    return null;
  } catch (error) {
    throw new Error(`Failed to fetch setting: ${error.message}`);
  }
};

/**
 * Update a single setting
 */
const updateSetting = async (key, value, companyId = 1) => {
  try {
    // Sanitize value
    const sanitizedValue = sanitizeValue(key, value);
    const stringValue = typeof sanitizedValue === 'object'
      ? JSON.stringify(sanitizedValue)
      : String(sanitizedValue);

    await pool.execute(
      `INSERT INTO system_settings (company_id, setting_key, setting_value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
      [companyId, key, stringValue, stringValue]
    );

    // Apply setting changes to system
    await applySettingChange(key, sanitizedValue, companyId);

    return { setting_key: key, setting_value: sanitizedValue };
  } catch (error) {
    throw new Error(`Failed to update setting: ${error.message}`);
  }
};

/**
 * Bulk update settings
 */
const bulkUpdateSettings = async (settings, companyId = 1) => {
  try {
    // Validate all settings
    const validation = validateSettings(settings);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const results = [];
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const setting of settings) {
        if (!setting.setting_key) continue;

        // Sanitize value
        const sanitizedValue = sanitizeValue(setting.setting_key, setting.setting_value);
        const stringValue = typeof sanitizedValue === 'object'
          ? JSON.stringify(sanitizedValue)
          : String(sanitizedValue);

        await connection.execute(
          `INSERT INTO system_settings (company_id, setting_key, setting_value)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
          [companyId, setting.setting_key, stringValue, stringValue]
        );

        results.push({
          setting_key: setting.setting_key,
          success: true,
          value: sanitizedValue
        });

        // Apply setting changes
        await applySettingChange(setting.setting_key, sanitizedValue, companyId);
      }

      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    throw new Error(`Failed to bulk update settings: ${error.message}`);
  }
};

/**
 * Delete a setting
 */
const deleteSetting = async (key, companyId = 1) => {
  try {
    await pool.execute(
      `DELETE FROM system_settings WHERE setting_key = ? AND company_id = ?`,
      [key, companyId]
    );
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to delete setting: ${error.message}`);
  }
};

/**
 * Apply setting changes to the system
 * This function handles the actual effect of settings on the system
 */
const applySettingChange = async (key, value, companyId) => {
  try {
    // Module enable/disable logic
    if (key.startsWith('module_')) {
      const moduleName = key.replace('module_', '');
      await updateModuleStatus(moduleName, value, companyId);
    }

    // Email configuration test
    if (key.startsWith('smtp_') || key === 'email_driver') {
      // Optionally test email configuration
      await validateEmailConfiguration(companyId);
    }

    // Theme changes
    if (['theme_mode', 'primary_color', 'secondary_color', 'font_family'].includes(key)) {
      await updateThemeCache(companyId);
    }

    // Cron job updates
    if (key === 'cron_job_enabled' && value) {
      await enableCronJobs(companyId);
    } else if (key === 'cron_job_enabled' && !value) {
      await disableCronJobs(companyId);
    }

    // Integration activations
    if (key === 'google_calendar_enabled' && value) {
      await initializeGoogleCalendar(companyId);
    }

    if (key === 'slack_enabled' && value) {
      await initializeSlack(companyId);
    }

    if (key === 'zapier_enabled' && value) {
      await initializeZapier(companyId);
    }

    // PWA configuration
    if (key === 'pwa_enabled' && value) {
      await generatePWAManifest(companyId)
    }

    // Sync company info if settings change
    if (companyId) {
      const companyFieldsMapping = {
        'company_logo': 'logo',
        'company_name': 'name',
        'company_email': 'email',
        'company_phone': 'phone',
        'company_website': 'website',
        'company_address': 'address'
      }

      const companyField = companyFieldsMapping[key]
      if (companyField) {
        await pool.execute(
          `UPDATE companies SET ${companyField} = ?, updated_at = NOW() WHERE id = ?`,
          [value, companyId]
        )
        console.log(`Synced ${key} to companies.${companyField} for company ${companyId}`)
      }

      if (key === 'default_currency' && value) {
        await pool.execute(
          `UPDATE companies SET currency = ?, updated_at = NOW() WHERE id = ?`,
          [String(value).trim(), companyId]
        )
        console.log(`Synced default_currency to companies.currency for company ${companyId}`)
      }
    }

    return true;
  } catch (error) {
    console.error(`Error applying setting change for ${key}:`, error.message);
    // Don't throw error here, just log it
    return false;
  }
};

/**
 * Update module status
 */
const updateModuleStatus = async (moduleName, enabled, companyId) => {
  // This will be used by middleware to check if module is accessible
  console.log(`Module ${moduleName} ${enabled ? 'enabled' : 'disabled'} for company ${companyId}`);
  return true;
};

/**
 * Validate email configuration
 */
const validateEmailConfiguration = async (companyId) => {
  // Get email settings
  const smtpHost = await getSetting('smtp_host', companyId);
  const smtpPort = await getSetting('smtp_port', companyId);
  const smtpUsername = await getSetting('smtp_username', companyId);

  // Basic validation
  if (smtpHost && smtpPort && smtpUsername) {
    console.log(`Email configuration validated for company ${companyId}`);
    return true;
  }

  return false;
};

/**
 * Update theme cache
 */
const updateThemeCache = async (companyId) => {
  // Cache theme settings for faster access
  const themeSettings = {
    theme_mode: await getSetting('theme_mode', companyId) || 'light',
    primary_color: await getSetting('primary_color', companyId) || '#217E45',
    secondary_color: await getSetting('secondary_color', companyId) || '#76AF88',
    font_family: await getSetting('font_family', companyId) || 'Inter, sans-serif'
  };

  console.log(`Theme cache updated for company ${companyId}:`, themeSettings);
  return themeSettings;
};

/**
 * Enable cron jobs
 */
const enableCronJobs = async (companyId) => {
  console.log(`Cron jobs enabled for company ${companyId}`);
  // This would typically start background jobs
  return true;
};

/**
 * Disable cron jobs
 */
const disableCronJobs = async (companyId) => {
  console.log(`Cron jobs disabled for company ${companyId}`);
  // This would typically stop background jobs
  return true;
};

/**
 * Initialize Google Calendar integration
 */
const initializeGoogleCalendar = async (companyId) => {
  const clientId = await getSetting('google_calendar_client_id', companyId);
  const clientSecret = await getSetting('google_calendar_client_secret', companyId);

  if (clientId && clientSecret) {
    console.log(`Google Calendar integration initialized for company ${companyId}`);
    return true;
  }

  throw new Error('Google Calendar credentials are missing');
};

/**
 * Initialize Slack integration
 */
const initializeSlack = async (companyId) => {
  const webhookUrl = await getSetting('slack_webhook_url', companyId);

  if (webhookUrl) {
    console.log(`Slack integration initialized for company ${companyId}`);
    return true;
  }

  throw new Error('Slack webhook URL is missing');
};

/**
 * Initialize Zapier integration
 */
const initializeZapier = async (companyId) => {
  const apiKey = await getSetting('zapier_api_key', companyId);

  if (apiKey) {
    console.log(`Zapier integration initialized for company ${companyId}`);
    return true;
  }

  throw new Error('Zapier API key is missing');
};

/**
 * Generate PWA manifest
 */
const generatePWAManifest = async (companyId) => {
  const manifest = {
    name: await getSetting('pwa_app_name', companyId) || 'Worksuite CRM',
    short_name: await getSetting('pwa_app_short_name', companyId) || 'Worksuite',
    description: await getSetting('pwa_app_description', companyId) || 'Worksuite CRM Application',
    theme_color: await getSetting('pwa_app_color', companyId) || '#217E45',
    background_color: '#ffffff',
    display: 'standalone',
    icons: []
  };

  console.log(`PWA manifest generated for company ${companyId}:`, manifest);
  return manifest;
};

/**
 * Get default settings
 */
const getDefaultSettings = () => {
  return [
    // General Settings
    { setting_key: 'company_name', setting_value: 'My Company' },
    { setting_key: 'company_email', setting_value: 'info@company.com' },
    { setting_key: 'system_name', setting_value: 'Worksuite CRM' },
    { setting_key: 'default_currency', setting_value: 'EUR' },
    { setting_key: 'default_timezone', setting_value: 'Europe/Berlin' },
    { setting_key: 'date_format', setting_value: 'Y-m-d' },
    { setting_key: 'time_format', setting_value: 'H:i' },
    { setting_key: 'fiscal_year_start', setting_value: '01-01' },
    { setting_key: 'session_timeout', setting_value: '30' },
    { setting_key: 'max_file_size', setting_value: '10' },
    { setting_key: 'allowed_file_types', setting_value: 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png' },
    { setting_key: 'company_logo', setting_value: '/uploads/default-logo.jpg' },

    // Localization
    { setting_key: 'default_language', setting_value: 'en' },
    { setting_key: 'currency_symbol_position', setting_value: 'before' },

    // UI Options
    { setting_key: 'theme_mode', setting_value: 'light' },
    { setting_key: 'font_family', setting_value: 'Inter, sans-serif' },
    { setting_key: 'primary_color', setting_value: '#217E45' },
    { setting_key: 'secondary_color', setting_value: '#76AF88' },
    { setting_key: 'sidebar_style', setting_value: 'default' },
    { setting_key: 'top_menu_style', setting_value: 'default' },

    // Footer
    { setting_key: 'footer_text', setting_value: '© 2024 Worksuite CRM. All rights reserved.' },
    { setting_key: 'footer_color', setting_value: '#102D2C' },

    // Modules (all enabled by default)
    { setting_key: 'module_leads', setting_value: 'true' },

    { setting_key: 'module_projects', setting_value: 'true' },
    { setting_key: 'module_tasks', setting_value: 'true' },
    { setting_key: 'module_invoices', setting_value: 'true' },
    { setting_key: 'module_estimates', setting_value: 'true' },
    { setting_key: 'module_proposals', setting_value: 'true' },
    { setting_key: 'module_payments', setting_value: 'true' },
    { setting_key: 'module_expenses', setting_value: 'true' },
    { setting_key: 'module_contracts', setting_value: 'true' },
    { setting_key: 'module_subscriptions', setting_value: 'true' },
    { setting_key: 'module_employees', setting_value: 'true' },
    { setting_key: 'module_attendance', setting_value: 'true' },
    { setting_key: 'module_time_tracking', setting_value: 'true' },
    { setting_key: 'module_events', setting_value: 'true' },
    { setting_key: 'module_departments', setting_value: 'true' },
    { setting_key: 'module_positions', setting_value: 'true' },
    { setting_key: 'module_messages', setting_value: 'true' },
    { setting_key: 'module_tickets', setting_value: 'true' },
    { setting_key: 'module_documents', setting_value: 'true' },
    { setting_key: 'module_reports', setting_value: 'true' },

    // Left Menu
    { setting_key: 'left_menu_style', setting_value: 'default' },

    // Notifications
    { setting_key: 'email_notifications', setting_value: 'true' },
    { setting_key: 'sms_notifications', setting_value: 'false' },
    { setting_key: 'push_notifications', setting_value: 'true' },
    { setting_key: 'notification_sound', setting_value: 'true' },

    // Integrations
    { setting_key: 'google_calendar_enabled', setting_value: 'false' },
    { setting_key: 'slack_enabled', setting_value: 'false' },
    { setting_key: 'zapier_enabled', setting_value: 'false' },

    // Cron Job
    { setting_key: 'cron_job_enabled', setting_value: 'true' },
    { setting_key: 'cron_job_frequency', setting_value: 'daily' },

    // Updates
    { setting_key: 'auto_update_enabled', setting_value: 'false' },
    { setting_key: 'update_channel', setting_value: 'stable' },

    // Access Permission
    { setting_key: 'default_role', setting_value: 'employee' },
    { setting_key: 'enable_two_factor', setting_value: 'false' },

    // Sales & Prospects
    { setting_key: 'auto_convert_lead', setting_value: 'false' },

    // Plugins
    { setting_key: 'auto_update_plugins', setting_value: 'false' },

    // PWA
    { setting_key: 'pwa_enabled', setting_value: 'false' },
    { setting_key: 'pwa_app_name', setting_value: 'Worksuite CRM' },
    { setting_key: 'pwa_app_short_name', setting_value: 'Worksuite' },
    { setting_key: 'pwa_app_description', setting_value: 'Worksuite CRM Application' },
    { setting_key: 'pwa_app_color', setting_value: '#217E45' },
  ];
};

/**
 * Initialize default settings for a company
 */
const initializeDefaultSettings = async (companyId = 1) => {
  try {
    const defaultSettings = getDefaultSettings();
    await bulkUpdateSettings(defaultSettings, companyId);
    return { success: true, message: 'Default settings initialized' };
  } catch (error) {
    throw new Error(`Failed to initialize default settings: ${error.message}`);
  }
};

module.exports = {
  getAllSettings,
  getSettingsByCategory,
  getSetting,
  updateSetting,
  bulkUpdateSettings,
  deleteSetting,
  getDefaultSettings,
  initializeDefaultSettings,
  applySettingChange
};
