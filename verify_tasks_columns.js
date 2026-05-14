require('dotenv').config();
const pool = require('./config/db');

async function check() {
    try {
        const [cols] = await pool.execute('SHOW COLUMNS FROM tasks');
        console.log('Tasks Columns:', JSON.stringify(cols.map(c => c.Field)));

        const [cols2] = await pool.execute('SHOW COLUMNS FROM meetings');
        console.log('Meetings Columns:', JSON.stringify(cols2.map(c => c.Field)));
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
check();
