const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function createConnectionRaw() {
  const uri = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (uri) {
    console.log('Using URI connection');
    return mysql.createConnection({ uri, multipleStatements: true });
  }
  const host = process.env.MYSQLHOST || process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1';
  const user = process.env.MYSQLUSER || process.env.DB_USER || process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQLPASSWORD || process.env.DB_PASS || process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQLDATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE;
  const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10);
  
  console.log(`Connecting to: ${host}:${port} / ${database}`);
  return mysql.createConnection({
    host,
    user,
    password,
    database,
    port,
    multipleStatements: true
  });
}

async function debug() {
    let conn;
    try {
        conn = await createConnectionRaw();
        const [rows] = await conn.query('SHOW COLUMNS FROM activities LIKE "assigned_to"');
        console.log('Column structure:', JSON.stringify(rows, null, 2));
        
        const [tableStatus] = await conn.query('SHOW TABLE STATUS LIKE "activities"');
        console.log('Table status:', JSON.stringify(tableStatus, null, 2));

        const [migrations] = await conn.query('SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5');
        console.log('Recent migrations:', JSON.stringify(migrations, null, 2));

        process.exit(0);
    } catch (e) {
        console.error('Debug failed:', e);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

debug();
