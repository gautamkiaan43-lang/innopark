const pool = require('./config/db');
async function check() {
    try {
        const [rows] = await pool.execute('SHOW COLUMNS FROM activities LIKE "assigned_to"');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
