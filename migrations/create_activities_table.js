const pool = require('../config/db');

async function migrate() {
    try {
        console.log('Starting migration: creating activities table...');

        await pool.execute(`
      CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('call', 'meeting', 'note', 'email', 'task', 'comment') NOT NULL,
        description TEXT,
        reference_type ENUM('lead', 'contact', 'company', 'deal') NOT NULL,
        reference_id INT NOT NULL,
        lead_id INT UNSIGNED DEFAULT NULL,
        company_id INT UNSIGNED DEFAULT NULL,
        contact_id INT UNSIGNED DEFAULT NULL,
        deal_id INT UNSIGNED DEFAULT NULL,
        created_by INT UNSIGNED DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) DEFAULT 0,
        INDEX idx_lead_id (lead_id),
        INDEX idx_company_id (company_id),
        INDEX idx_contact_id (contact_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_reference (reference_type, reference_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
