const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'innopark-db',
  port: parseInt(process.env.DB_PORT) || 3306
};

async function check() {
  const pool = mysql.createPool(config);
  try {
    const [rows] = await pool.query('SELECT e.*, u.name, u.email FROM employees e JOIN users u ON e.user_id = u.id');
    console.log('Employees:');
    console.table(rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

check();
