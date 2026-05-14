const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
  try {
    const conn = await mysql.createConnection(process.env.DATABASE_URL || process.env.MYSQL_URL);
    const [cols] = await conn.execute('DESCRIBE clients');
    console.log('Clients Table Columns:', cols.map(c => c.Field));
    
    const [compCols] = await conn.execute('DESCRIBE companies');
    console.log('Companies Table Columns:', compCols.map(c => c.Field));
    
    await conn.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema();
