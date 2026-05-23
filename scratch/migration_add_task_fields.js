const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQLUSER || process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASS || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'innopark-db',
  port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10)
};

async function migrate() {
  console.log(`Attempting migration on DB host=${config.host} port=${config.port} db=${config.database} user=${config.user}`);
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to database.');

    const [columns] = await connection.execute('DESCRIBE tasks');
    const columnNames = columns.map(col => col.Field);

    if (!columnNames.includes('is_completed')) {
      console.log('Adding column: is_completed');
      await connection.execute('ALTER TABLE tasks ADD COLUMN is_completed TINYINT(1) DEFAULT 0');
      console.log('is_completed added successfully.');
    } else {
      console.log('is_completed already exists.');
    }

    if (!columnNames.includes('is_pinned')) {
      console.log('Adding column: is_pinned');
      await connection.execute('ALTER TABLE tasks ADD COLUMN is_pinned TINYINT(1) DEFAULT 0');
      console.log('is_pinned added successfully.');
    } else {
      console.log('is_pinned already exists.');
    }

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
