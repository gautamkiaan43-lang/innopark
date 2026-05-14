require('dotenv').config();
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', 'add_tasks_meetings.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by ';' but be careful about ';' inside strings.
        // Simple splitting might work if the SQL is clean.
        // Or just execute the whole thing if the driver supports multi-statements.
        // mysql2 usually supports multi-statements if configured, but let's try splitting.

        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const stmt of statements) {
            console.log('Executing:', stmt.substring(0, 50) + '...');
            await pool.query(stmt);
        }

        console.log('Migration successful');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();
