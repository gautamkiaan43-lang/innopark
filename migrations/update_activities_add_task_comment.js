const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Migration: Update activities table to add 'task' and 'comment' types
 * This supports the Activity Timeline tabs feature
 */
async function migrate() {
    try {
        console.log('Starting migration: updating activities table to add task and comment types...');

        // Read the SQL file
        const sqlPath = path.join(__dirname, '../database/update_activities_table_add_task_comment.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the migration
        await pool.execute(sql);

        console.log('Migration completed successfully.');
        console.log('Activities table now supports: call, meeting, note, email, task, comment');
        
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    migrate();
}

module.exports = { migrate };

