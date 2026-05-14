const pool = require('../config/db');

async function migrate() {
    try {
        console.log('Starting migration: adding lead_id to invoices table...');

        // 1. Add lead_id column
        console.log('Adding lead_id column...');
        await pool.execute(`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS lead_id INT(11) UNSIGNED DEFAULT NULL 
      AFTER company_id
    `);

        // 2. Add foreign key index (optional but recommended for performance)
        console.log('Adding index on lead_id...');
        try {
            await pool.execute(`
        CREATE INDEX idx_invoices_lead_id ON invoices(lead_id)
      `);
        } catch (idxError) {
            if (idxError.code === 'ER_DUP_KEYNAME') {
                console.log('Index already exists, skipping.');
            } else {
                throw idxError;
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
