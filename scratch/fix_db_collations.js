require('dotenv').config();
const pool = require('../config/db');

async function main() {
    try {
        console.log('=== STARTING COLLATION STANDARDIZATION ===');

        const tables = ['stage_history', 'lead_stages', 'deal_stages', 'activities'];

        for (const table of tables) {
            console.log(`Standardizing collation of table ${table}...`);
            try {
                // Alter table collation to utf8mb4_unicode_ci
                await pool.query(`ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
                console.log(`✅ Table ${table} successfully standardized.`);
            } catch (err) {
                console.error(`Failed to alter table ${table}:`, err.message);
            }
        }

        console.log('=== COLLATION STANDARDIZATION COMPLETED ===');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
