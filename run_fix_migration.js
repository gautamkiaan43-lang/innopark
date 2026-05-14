const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function createConnectionRaw() {
  const uri = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (uri) {
    return mysql.createConnection({ uri, multipleStatements: true });
  }
  const host = process.env.MYSQLHOST || process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1';
  const user = process.env.MYSQLUSER || process.env.DB_USER || process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQLPASSWORD || process.env.DB_PASS || process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQLDATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE;
  const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10);
  
  return mysql.createConnection({
    host,
    user,
    password,
    database,
    port,
    multipleStatements: true
  });
}

async function run() {
    let conn;
    try {
        conn = await createConnectionRaw();
        console.log('Connected to DB');
        
        const sql = `ALTER TABLE activities 
                     MODIFY COLUMN assigned_to INT(10) UNSIGNED NULL DEFAULT NULL,
                     MODIFY COLUMN is_pinned TINYINT(1) DEFAULT 0;`;
        
        await conn.query(sql);
        console.log('Migration Applied: activities table updated.');
        
        // Mark it as applied in schema_migrations so the main runner skips it later
        await conn.query('INSERT INTO schema_migrations (filename) VALUES (?) ON DUPLICATE KEY UPDATE filename=filename', ['20260427_fix_activities_assigned_to.sql']);
        console.log('Marked as applied in schema_migrations');
        
        process.exit(0);
    } catch (e) {
        console.error('Failed:', e);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

run();
