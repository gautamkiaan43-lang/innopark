require('dotenv').config();
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    try {
        const sqlPath = path.join(__dirname, 'cleanup_client_role.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const stmt of statements) {
            console.log('Executing:', stmt.substring(0, 100) + '...');
            await pool.query(stmt);
        }

        console.log('Migration successful: cleanup_client_role.sql executed.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}
migrate();
