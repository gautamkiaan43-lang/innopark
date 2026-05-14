const pool = require('../config/db');

async function migrate() {
    try {
        // Check if lead_id column exists
        const [columns] = await pool.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'lead_id'
    `);

        if (columns.length === 0) {
            await pool.execute(`ALTER TABLE companies ADD COLUMN lead_id INT UNSIGNED NULL AFTER package_id`);
            await pool.execute(`ALTER TABLE companies ADD INDEX idx_company_lead (lead_id)`);
            console.log('Added lead_id column and index to companies table');
        } else {
            console.log('lead_id column already exists in companies table');
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
