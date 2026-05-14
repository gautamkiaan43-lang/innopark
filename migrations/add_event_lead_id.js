/**
 * Migration: Add lead_id column to events table for follow-up linking
 * Run: node migrations/add_event_lead_id.js
 */

require('dotenv').config();
const pool = require('../config/db');

const runMigration = async () => {
    try {
        console.log('Adding lead_id column to events table...');

        // Check if lead_id column exists
        const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'events' 
      AND COLUMN_NAME = 'lead_id'
    `);

        if (columns.length === 0) {
            // Add lead_id column
            await pool.execute(`
        ALTER TABLE events 
        ADD COLUMN lead_id INT NULL AFTER company_id,
        ADD INDEX idx_lead_id (lead_id)
      `);
            console.log('✅ lead_id column added to events table');
        } else {
            console.log('lead_id column already exists');
        }

        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
