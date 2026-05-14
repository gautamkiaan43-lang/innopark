require('dotenv').config();
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', 'fix_tasks_columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        try {
            const [check] = await pool.execute("SHOW COLUMNS FROM tasks LIKE 'assigned_to'");
            if (check.length > 0) {
                console.log('Columns already exist, skipping');
                process.exit(0);
            }

            const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

            for (const stmt of statements) {
                console.log('Executing:', stmt.substring(0, 50) + '...');
                await pool.query(stmt);
            }

            console.log('Migration successful');
        } catch (err) {
            console.error(err);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();
