/**
 * Migration: Add Default System Settings
 * Date: 2026-01-03
 * Description: Initialize default settings for all companies
 */

const pool = require('../config/db');

const defaultSettings = [
  // General Settings
  { key: 'company_name', value: 'My Company' },
  { key: 'company_email', value: 'info@company.com' },
  { key: 'system_name', value: 'Worksuite CRM' },
  { key: 'default_currency', value: 'USD' },
  { key: 'default_timezone', value: 'UTC' },
  { key: 'date_format', value: 'Y-m-d' },
  { key: 'time_format', value: 'H:i' },
  { key: 'fiscal_year_start', value: '01-01' },
  { key: 'session_timeout', value: '30' },
  { key: 'max_file_size', value: '10' },
  { key: 'allowed_file_types', value: 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png' },

  // Localization
  { key: 'default_language', value: 'en' },
  { key: 'currency_symbol_position', value: 'before' },

  // UI Options
  { key: 'theme_mode', value: 'light' },
  { key: 'font_family', value: 'Inter, sans-serif' },
  { key: 'primary_color', value: '#217E45' },
  { key: 'secondary_color', value: '#76AF88' },
  { key: 'sidebar_style', value: 'default' },
  { key: 'top_menu_style', value: 'default' },

  // Footer
  { key: 'footer_text', value: '© 2024 Worksuite CRM. All rights reserved.' },
  { key: 'footer_color', value: '#102D2C' },

  // Modules (all enabled by default)
  { key: 'module_leads', value: 'true' },
  { key: 'module_clients', value: 'true' },
  { key: 'module_projects', value: 'true' },
  { key: 'module_tasks', value: 'true' },
  { key: 'module_invoices', value: 'true' },
  { key: 'module_estimates', value: 'true' },
  { key: 'module_proposals', value: 'true' },
  { key: 'module_payments', value: 'true' },
  { key: 'module_expenses', value: 'true' },
  { key: 'module_contracts', value: 'true' },
  { key: 'module_subscriptions', value: 'true' },
  { key: 'module_employees', value: 'true' },
  { key: 'module_attendance', value: 'true' },
  { key: 'module_time_tracking', value: 'true' },
  { key: 'module_events', value: 'true' },
  { key: 'module_departments', value: 'true' },
  { key: 'module_positions', value: 'true' },
  { key: 'module_messages', value: 'true' },
  { key: 'module_tickets', value: 'true' },
  { key: 'module_documents', value: 'true' },
  { key: 'module_reports', value: 'true' },

  // Left Menu
  { key: 'left_menu_style', value: 'default' },

  // Notifications
  { key: 'email_notifications', value: 'true' },
  { key: 'sms_notifications', value: 'false' },
  { key: 'push_notifications', value: 'true' },
  { key: 'notification_sound', value: 'true' },

  // Integrations
  { key: 'google_calendar_enabled', value: 'false' },
  { key: 'slack_enabled', value: 'false' },
  { key: 'zapier_enabled', value: 'false' },

  // Cron Job
  { key: 'cron_job_enabled', value: 'true' },
  { key: 'cron_job_frequency', value: 'daily' },

  // Updates
  { key: 'auto_update_enabled', value: 'false' },
  { key: 'update_channel', value: 'stable' },

  // Access Permission
  { key: 'default_role', value: 'employee' },
  { key: 'enable_two_factor', value: 'false' },

  // Client Portal
  { key: 'client_portal_enabled', value: 'true' },
  { key: 'client_can_view_invoices', value: 'true' },
  { key: 'client_can_view_projects', value: 'true' },

  // Sales & Prospects
  { key: 'auto_convert_lead', value: 'false' },

  // Plugins
  { key: 'auto_update_plugins', value: 'false' },

  // PWA
  { key: 'pwa_enabled', value: 'false' },
  { key: 'pwa_app_name', value: 'Worksuite CRM' },
  { key: 'pwa_app_short_name', value: 'Worksuite' },
  { key: 'pwa_app_description', value: 'Worksuite CRM Application' },
  { key: 'pwa_app_color', value: '#217E45' },
];

/**
 * Run migration
 */
const up = async () => {
  console.log('Running migration: Add Default Settings');

  try {
    // Get all companies
    const [companies] = await pool.execute('SELECT id FROM companies');

    console.log(`Found ${companies.length} companies`);

    for (const company of companies) {
      console.log(`Adding default settings for company ID: ${company.id}`);

      for (const setting of defaultSettings) {
        await pool.execute(
          `INSERT INTO system_settings (company_id, setting_key, setting_value)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE setting_value = setting_value`,
          [company.id, setting.key, setting.value]
        );
      }

      console.log(`✓ Default settings added for company ID: ${company.id}`);
    }

    console.log('✓ Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

/**
 * Rollback migration
 */
const down = async () => {
  console.log('Rolling back migration: Add Default Settings');

  try {
    const settingKeys = defaultSettings.map(s => s.key);
    const placeholders = settingKeys.map(() => '?').join(',');

    await pool.execute(
      `DELETE FROM system_settings WHERE setting_key IN (${placeholders})`,
      settingKeys
    );

    console.log('✓ Rollback completed successfully');
    return true;
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration executed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration execution failed:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
