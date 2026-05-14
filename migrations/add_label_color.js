/**
 * Migration: Add color column to lead_labels table
 * Run: node migrations/add_label_color.js
 */

require('dotenv').config();
const pool = require('../config/db');

const runMigration = async () => {
    try {
        console.log('Adding color column to lead_labels table...');

        // Check if color column exists
        const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'lead_labels' 
      AND COLUMN_NAME = 'color'
    `);

        if (columns.length === 0) {
            // Add color column
            await pool.execute(`
        ALTER TABLE lead_labels 
        ADD COLUMN color VARCHAR(7) DEFAULT '#22c55e' AFTER label
      `);
            console.log('✅ Color column added to lead_labels');
        } else {
            console.log('Color column already exists');
        }

        // Create lead_label_definitions table for storing label definitions
        await pool.execute(`
      CREATE TABLE IF NOT EXISTS lead_label_definitions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(7) DEFAULT '#22c55e',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_label_per_company (company_id, name),
        INDEX idx_company (company_id)
      )
    `);
        console.log('✅ lead_label_definitions table created/exists');

        // Insert default labels for all companies
        const [companies] = await pool.execute('SELECT id FROM companies');

        const defaultLabels = [
            { name: 'Hot', color: '#ef4444' },
            { name: 'Warm', color: '#f97316' },
            { name: 'Cold', color: '#3b82f6' },
            { name: 'New', color: '#22c55e' },
            { name: 'Follow-up', color: '#a855f7' },
            { name: 'Converted', color: '#10b981' },
            { name: 'Priority', color: '#eab308' },
        ];

        for (const company of companies) {
            for (const label of defaultLabels) {
                try {
                    await pool.execute(`
            INSERT IGNORE INTO lead_label_definitions (company_id, name, color)
            VALUES (?, ?, ?)
          `, [company.id, label.name, label.color]);
                } catch (e) {
                    // Ignore duplicates
                }
            }
        }
        console.log('✅ Default labels inserted for all companies');

        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
