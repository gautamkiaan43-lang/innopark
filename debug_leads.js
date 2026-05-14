const mysql = require('mysql2/promise');

async function debugLeads() {
  const config = { host: '127.0.0.1', user: 'root', password: '', database: 'innopark_db', port: 3307 };
  try {
    const connection = await mysql.createConnection(config);
    const companyId = 2; // What we are using
    const [rows] = await connection.execute('SELECT id, person_name, company_id, is_deleted FROM leads WHERE company_id = ? AND is_deleted = 0', [companyId]);
    console.log(`Leads found for Company 2: ${rows.length}`);
    console.table(rows);
    await connection.end();
  } catch (e) {
    console.log(`Failed: ${e.message}`);
  }
}

debugLeads();
