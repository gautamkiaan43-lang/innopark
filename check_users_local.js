
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'crm_db_innopark',
      port: parseInt(process.env.DB_PORT) || 3306
    });

    const [rows] = await connection.execute('SELECT id, email, role FROM users');
    console.log('Users in DB:');
    console.table(rows);
    await connection.end();
  } catch (err) {
    console.error('Error connecting to DB:', err.message);
  }
}

checkUsers();
