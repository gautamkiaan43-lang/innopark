/**
 * Run Settings Migration
 * Creates system_settings table and inserts default settings
 */

const pool = require('./config/db');

const runMigration = async () => {
  console.log('🚀 Starting Settings Migration...\n');

  try {
    // Step 1: Create system_settings table
    console.log('📦 Creating system_settings table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        company_id INT UNSIGNED NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT NULL,
        setting_type VARCHAR(50) DEFAULT 'string',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_setting (company_id, setting_key),
        INDEX idx_setting_key (setting_key),
        INDEX idx_setting_company (company_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table created successfully!\n');

    // Step 2: Insert default settings
    console.log('📝 Inserting default settings...');

    const defaultSettings = [
      // General Settings
      ['company_name', 'My Company'],
      ['company_email', 'info@company.com'],
      ['company_phone', ''],
      ['company_address', ''],
      ['company_website', ''],
      ['company_logo', ''],
      ['system_name', 'Worksuite CRM'],
      ['default_currency', 'USD'],
      ['default_timezone', 'UTC'],
      ['date_format', 'Y-m-d'],
      ['time_format', 'H:i'],
      ['fiscal_year_start', '01-01'],
      ['session_timeout', '30'],
      ['max_file_size', '10'],
      ['allowed_file_types', 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png'],

      // Localization
      ['default_language', 'en'],
      ['currency_symbol_position', 'before'],
      ['date_format_localization', 'DD/MM/YYYY'],
      ['time_format_localization', '24h'],
      ['timezone_localization', 'UTC'],

      // Email Settings
      ['email_from', 'noreply@company.com'],
      ['email_from_name', 'Worksuite CRM'],
      ['smtp_host', ''],
      ['smtp_port', '587'],
      ['smtp_username', ''],
      ['smtp_password', ''],
      ['smtp_encryption', 'tls'],
      ['email_driver', 'smtp'],

      // UI Options
      ['theme_mode', 'light'],
      ['font_family', 'Inter, sans-serif'],
      ['primary_color', '#217E45'],
      ['secondary_color', '#76AF88'],
      ['sidebar_style', 'default'],
      ['top_menu_style', 'default'],

      // Top Menu
      ['top_menu_logo', ''],
      ['top_menu_color', '#102D2C'],

      // Footer
      ['footer_text', '© 2024 Worksuite CRM. All rights reserved.'],
      ['footer_color', '#102D2C'],

      // PWA
      ['pwa_enabled', 'false'],
      ['pwa_app_name', 'Worksuite CRM'],
      ['pwa_app_short_name', 'Worksuite'],
      ['pwa_app_description', 'CRM Application'],
      ['pwa_app_icon', ''],
      ['pwa_app_color', '#217E45'],

      // Modules (all enabled by default)
      ['module_leads', 'true'],
      ['module_clients', 'true'],
      ['module_projects', 'true'],
      ['module_tasks', 'true'],
      ['module_invoices', 'true'],
      ['module_estimates', 'true'],
      ['module_proposals', 'true'],
      ['module_payments', 'true'],
      ['module_expenses', 'true'],
      ['module_contracts', 'true'],
      ['module_subscriptions', 'true'],
      ['module_employees', 'true'],
      ['module_attendance', 'true'],
      ['module_time_tracking', 'true'],
      ['module_events', 'true'],
      ['module_departments', 'true'],
      ['module_positions', 'true'],
      ['module_messages', 'true'],
      ['module_tickets', 'true'],
      ['module_documents', 'true'],
      ['module_reports', 'true'],

      // Left Menu
      ['left_menu_style', 'default'],

      // Notifications
      ['email_notifications', 'true'],
      ['sms_notifications', 'false'],
      ['push_notifications', 'true'],
      ['notification_sound', 'true'],

      // Integrations
      ['google_calendar_enabled', 'false'],
      ['google_calendar_client_id', ''],
      ['google_calendar_client_secret', ''],
      ['slack_enabled', 'false'],
      ['slack_webhook_url', ''],
      ['zapier_enabled', 'false'],
      ['zapier_api_key', ''],

      // Cron Job
      ['cron_job_enabled', 'true'],
      ['cron_job_frequency', 'daily'],
      ['cron_job_last_run', ''],

      // Updates
      ['auto_update_enabled', 'false'],
      ['update_channel', 'stable'],
      ['last_update_check', ''],

      // Access Permission
      ['default_role', 'employee'],
      ['enable_two_factor', 'false'],

      // Client Portal
      ['client_portal_enabled', 'true'],
      ['client_portal_url', ''],
      ['client_can_view_invoices', 'true'],
      ['client_can_view_projects', 'true'],

      // Sales & Prospects
      ['auto_convert_lead', 'false'],
      ['default_lead_source', 'website'],

      // Plugins
      ['auto_update_plugins', 'false'],
    ];

    let insertedCount = 0;
    for (const [key, value] of defaultSettings) {
      try {
        await pool.execute(
          `INSERT IGNORE INTO system_settings (company_id, setting_key, setting_value) VALUES (?, ?, ?)`,
          [1, key, value]
        );
        insertedCount++;
      } catch (err) {
        console.log(`  ⚠️ Skipped ${key}: ${err.message}`);
      }
    }

    console.log(`✅ Inserted ${insertedCount} default settings!\n`);

    // Step 3: Verify
    const [count] = await pool.execute(
      `SELECT COUNT(*) as total FROM system_settings WHERE company_id = 1`
    );
    console.log(`📊 Total settings in database: ${count[0].total}\n`);

    console.log('🎉 Migration completed successfully!');
    console.log('\n📌 Next steps:');
    console.log('   1. Restart the backend server');
    console.log('   2. Open http://localhost:5173/app/admin/settings');
    console.log('   3. All settings should now work!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

runMigration();
