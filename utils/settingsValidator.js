/**
 * Settings Validation Utility
 * Validates all settings before saving to database
 */

const settingsSchema = {
  // General Settings
  company_name: { type: 'string', required: false, maxLength: 255 },
  company_email: { type: 'email', required: false },
  company_phone: { type: 'string', required: false, maxLength: 50 },
  company_address: { type: 'string', required: false },
  company_website: { type: 'url', required: false },
  company_logo: { type: 'string', required: false },
  system_name: { type: 'string', required: false, maxLength: 255 },
  default_currency: { type: 'enum', required: false, values: ['USD', 'EUR', 'GBP', 'INR', 'AED', 'AUD', 'CAD', 'CHF', 'CNY', 'JPY', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'ZAR', 'BRL', 'MXN', 'KRW', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'PKR', 'BDT', 'EGP', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'TRY', 'RUB', 'PLN', 'CZK', 'HUF', 'RON', 'ILS', 'NGN', 'KES', 'GHS', 'TZS', 'UGX', 'MAD', 'DZD', 'TND', 'CLP', 'COP', 'PEN', 'ARS', 'VES'] },
  default_timezone: { type: 'string', required: false },
  date_format: { type: 'enum', required: false, values: ['Y-m-d', 'm/d/Y', 'd/m/Y', 'd-m-Y'] },
  time_format: { type: 'enum', required: false, values: ['H:i', 'h:i A'] },
  fiscal_year_start: { type: 'string', required: false },
  session_timeout: { type: 'number', required: false, min: 5, max: 480 },
  max_file_size: { type: 'number', required: false, min: 1, max: 1024 },
  allowed_file_types: { type: 'string', required: false },

  // Localization
  default_language: { type: 'enum', required: false, values: ['en', 'es', 'fr', 'de', 'ar', 'hi'] },
  date_format_localization: { type: 'enum', required: false, values: ['Y-m-d', 'm/d/Y', 'd/m/Y', 'd-m-Y'] },
  time_format_localization: { type: 'enum', required: false, values: ['H:i', 'h:i A'] },
  timezone_localization: { type: 'string', required: false },
  currency_symbol_position: { type: 'enum', required: false, values: ['before', 'after'] },

  // Email Settings
  email_from: { type: 'email', required: false },
  email_from_name: { type: 'string', required: false, maxLength: 255 },
  smtp_host: { type: 'string', required: false },
  smtp_port: { type: 'number', required: false, min: 1, max: 65535 },
  smtp_username: { type: 'string', required: false },
  smtp_password: { type: 'string', required: false },
  smtp_encryption: { type: 'enum', required: false, values: ['tls', 'ssl', 'none'] },
  email_driver: { type: 'enum', required: false, values: ['smtp', 'sendmail', 'mailgun', 'ses'] },

  // UI Options
  theme_mode: { type: 'enum', required: false, values: ['light', 'dark'] },
  font_family: { type: 'string', required: false },
  primary_color: { type: 'color', required: false },
  secondary_color: { type: 'color', required: false },
  sidebar_style: { type: 'enum', required: false, values: ['default', 'compact', 'icon-only'] },
  top_menu_style: { type: 'enum', required: false, values: ['default', 'centered', 'minimal'] },

  // Top Menu
  top_menu_logo: { type: 'string', required: false },
  top_menu_color: { type: 'color', required: false },

  // Footer
  footer_text: { type: 'string', required: false },
  footer_color: { type: 'color', required: false },

  // PWA
  pwa_enabled: { type: 'boolean', required: false },
  pwa_app_name: { type: 'string', required: false, maxLength: 255 },
  pwa_app_short_name: { type: 'string', required: false, maxLength: 50 },
  pwa_app_description: { type: 'string', required: false },
  pwa_app_icon: { type: 'string', required: false },
  pwa_app_color: { type: 'color', required: false },

  // Modules
  module_leads: { type: 'boolean', required: false },
  module_clients: { type: 'boolean', required: false },
  module_projects: { type: 'boolean', required: false },
  module_tasks: { type: 'boolean', required: false },
  module_invoices: { type: 'boolean', required: false },
  module_estimates: { type: 'boolean', required: false },
  module_proposals: { type: 'boolean', required: false },
  module_payments: { type: 'boolean', required: false },
  module_expenses: { type: 'boolean', required: false },
  module_contracts: { type: 'boolean', required: false },
  module_subscriptions: { type: 'boolean', required: false },
  module_employees: { type: 'boolean', required: false },
  module_attendance: { type: 'boolean', required: false },
  module_time_tracking: { type: 'boolean', required: false },
  module_events: { type: 'boolean', required: false },
  module_departments: { type: 'boolean', required: false },
  module_positions: { type: 'boolean', required: false },
  module_messages: { type: 'boolean', required: false },
  module_tickets: { type: 'boolean', required: false },
  module_documents: { type: 'boolean', required: false },
  module_reports: { type: 'boolean', required: false },

  // Left Menu
  left_menu_style: { type: 'enum', required: false, values: ['default', 'compact', 'icon-only', 'collapsed'] },

  // Notifications
  email_notifications: { type: 'boolean', required: false },
  sms_notifications: { type: 'boolean', required: false },
  push_notifications: { type: 'boolean', required: false },
  notification_sound: { type: 'boolean', required: false },

  // Integrations
  google_calendar_enabled: { type: 'boolean', required: false },
  google_calendar_client_id: { type: 'string', required: false },
  google_calendar_client_secret: { type: 'string', required: false },
  slack_enabled: { type: 'boolean', required: false },
  slack_webhook_url: { type: 'url', required: false },
  zapier_enabled: { type: 'boolean', required: false },
  zapier_api_key: { type: 'string', required: false },

  // Cron Job
  cron_job_enabled: { type: 'boolean', required: false },
  cron_job_frequency: { type: 'enum', required: false, values: ['hourly', 'daily', 'weekly', 'monthly'] },
  cron_job_last_run: { type: 'datetime', required: false },

  // Updates
  auto_update_enabled: { type: 'boolean', required: false },
  update_channel: { type: 'enum', required: false, values: ['stable', 'beta', 'alpha'] },
  last_update_check: { type: 'datetime', required: false },

  // Access Permission
  default_role: { type: 'enum', required: false, values: ['admin', 'employee', 'client'] },
  enable_two_factor: { type: 'boolean', required: false },

  // Client Portal
  client_portal_enabled: { type: 'boolean', required: false },
  client_portal_url: { type: 'url', required: false },
  client_can_view_invoices: { type: 'boolean', required: false },
  client_can_view_projects: { type: 'boolean', required: false },

  // Sales & Prospects
  auto_convert_lead: { type: 'boolean', required: false },
  default_lead_source: { type: 'string', required: false },

  // Plugins
  auto_update_plugins: { type: 'boolean', required: false },
};

/**
 * Validate a single setting value
 */
const validateSetting = (key, value) => {
  const schema = settingsSchema[key];

  if (!schema) {
    return { valid: true }; // Unknown settings are allowed
  }

  const errors = [];

  // Required check
  if (schema.required && (value === null || value === undefined || value === '')) {
    errors.push(`${key} is required`);
    return { valid: false, errors };
  }

  // Skip validation if value is empty and not required
  if (!schema.required && (value === null || value === undefined || value === '')) {
    return { valid: true };
  }

  // Type validation
  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`${key} must be a string`);
      } else if (schema.maxLength && value.length > schema.maxLength) {
        errors.push(`${key} must be at most ${schema.maxLength} characters`);
      }
      break;

    case 'number':
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) {
        errors.push(`${key} must be a number`);
      } else {
        if (schema.min !== undefined && numValue < schema.min) {
          errors.push(`${key} must be at least ${schema.min}`);
        }
        if (schema.max !== undefined && numValue > schema.max) {
          errors.push(`${key} must be at most ${schema.max}`);
        }
      }
      break;

    case 'boolean':
      const boolValue = value === 'true' || value === true || value === 1 || value === '1';
      if (typeof value !== 'boolean' && !['true', 'false', '1', '0', 1, 0].includes(value)) {
        errors.push(`${key} must be a boolean`);
      }
      break;

    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value === 'string' && !emailRegex.test(value)) {
        errors.push(`${key} must be a valid email address`);
      }
      break;

    case 'url':
      try {
        new URL(value);
      } catch (e) {
        errors.push(`${key} must be a valid URL`);
      }
      break;

    case 'color':
      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (typeof value === 'string' && !colorRegex.test(value)) {
        errors.push(`${key} must be a valid hex color (e.g., #FFFFFF)`);
      }
      break;

    case 'enum':
      if (!schema.values.includes(value)) {
        errors.push(`${key} must be one of: ${schema.values.join(', ')}`);
      }
      break;

    case 'datetime':
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        errors.push(`${key} must be a valid date`);
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate multiple settings
 */
const validateSettings = (settings) => {
  const errors = [];

  if (!Array.isArray(settings)) {
    return {
      valid: false,
      errors: ['Settings must be an array']
    };
  }

  settings.forEach((setting, index) => {
    if (!setting.setting_key) {
      errors.push(`Setting at index ${index} is missing setting_key`);
      return;
    }

    const validation = validateSetting(setting.setting_key, setting.setting_value);
    if (!validation.valid) {
      errors.push(...validation.errors);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize setting value
 */
const sanitizeValue = (key, value) => {
  const schema = settingsSchema[key];

  if (!schema) {
    return value;
  }

  // Convert to proper type
  switch (schema.type) {
    case 'boolean':
      return value === 'true' || value === true || value === 1 || value === '1';
    case 'number':
      return typeof value === 'string' ? parseFloat(value) : value;
    case 'string':
      return String(value).trim();
    default:
      return value;
  }
};

module.exports = {
  validateSetting,
  validateSettings,
  sanitizeValue,
  settingsSchema
};
