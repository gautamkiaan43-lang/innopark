/**
 * Fix Database Schema
 * Checks for missing columns in 'users' table and adds them if necessary
 */

const pool = require('./config/db');

const fixSchema = async () => {
  console.log('🚀 Checking database schema for missing columns...\n');

  try {
    // Check columns in 'users' table
    const [columns] = await pool.execute('SHOW COLUMNS FROM users');
    const columnNames = columns.map(c => c.Field);

    const requiredColumns = [
      { name: 'emergency_contact_name', type: 'VARCHAR(255) NULL' },
      { name: 'emergency_contact_phone', type: 'VARCHAR(50) NULL' },
      { name: 'emergency_contact_relation', type: 'VARCHAR(100) NULL' },
      { name: 'bank_name', type: 'VARCHAR(255) NULL' },
      { name: 'bank_account_number', type: 'VARCHAR(100) NULL' },
      { name: 'bank_ifsc', type: 'VARCHAR(50) NULL' },
      { name: 'bank_branch', type: 'VARCHAR(255) NULL' },
      { name: 'timezone', type: "VARCHAR(50) DEFAULT 'Europe/Berlin'" }
    ];

    let changesMade = false;

    for (const col of requiredColumns) {
      if (!columnNames.includes(col.name)) {
        console.log(`➕ Adding missing column: ${col.name}...`);
        await pool.execute(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Column ${col.name} added!`);
        changesMade = true;
      } else {
        console.log(`ℹ️ Column ${col.name} already exists.`);
      }
    }

    // Also check company_id in system_settings if it's nullable or missing
    try {
      const [sysSettingsCols] = await pool.execute('SHOW COLUMNS FROM system_settings');
      const sysColNames = sysSettingsCols.map(c => c.Field);
      if (!sysColNames.includes('company_id')) {
         console.log('➕ Adding missing company_id to system_settings...');
         await pool.execute('ALTER TABLE system_settings ADD COLUMN company_id INT UNSIGNED NULL AFTER id');
         console.log('✅ company_id added to system_settings!');
         changesMade = true;
      }
    } catch (e) {
      console.log('⚠️ system_settings table might not exist yet.');
    }

    if (changesMade) {
      console.log('\n🎉 Database schema fixed successfully!');
    } else {
      console.log('\n✅ Database schema is up to date.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix schema:', error.message);
    console.error(error);
    process.exit(1);
  }
};

fixSchema();
