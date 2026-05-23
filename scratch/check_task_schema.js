const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTasks() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'innopark-db',
      port: parseInt(process.env.DB_PORT) || 3306
    });

    const [columns] = await connection.execute('DESCRIBE tasks');
    console.log('Columns in tasks table:');
    console.table(columns);
    await connection.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkTasks();
