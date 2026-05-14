require('dotenv').config();
const pool = require('./config/db');

async function check() {
    try {
        const [tables] = await pool.execute('SHOW TABLES LIKE "task_users"');
        console.log('Task Users Table:', tables);

        const [taskCols] = await pool.execute('SHOW COLUMNS FROM tasks');
        const assignedTo = taskCols.find(c => c.Field === 'assigned_to');
        console.log('assigned_to in tasks?', !!assignedTo);
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
check();
