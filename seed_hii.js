const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        console.log('Inserting dummy "hii" message...');
        // Assume Admin is 1, Devesh is 5 (or find first employee)
        const [users] = await connection.execute('SELECT id FROM users WHERE role = "EMPLOYEE" LIMIT 1');
        const employeeId = users[0]?.id || 2;
        
        await connection.execute(
            'INSERT INTO messages (from_user_id, to_user_id, company_id, message, is_read, is_deleted) VALUES (?, 1, 1, "hii", 0, 0)',
            [employeeId]
        );
        console.log('Inserted "hii" from user ' + employeeId + ' to Admin (1)');
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
        process.exit();
    }
}
seed();
