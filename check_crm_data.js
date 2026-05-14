const mysql = require('mysql2/promise');

async function checkCRM() {
  const config = { host: '127.0.0.1', user: 'root', password: '', database: 'innopark_db', port: 3307 };
  try {
    const connection = await mysql.createConnection(config);
    const [c] = await connection.execute('SELECT COUNT(*) as total FROM contacts');
    const [u] = await connection.execute('SELECT COUNT(*) as total FROM companies');
    const [l] = await connection.execute('SELECT COUNT(*) as total FROM leads');
    console.log(`Diagnostic: Contacts(${c[0].total}), Companies(${u[0].total}), Leads(${l[0].total})`);
    
    if (c[0].total == 0) {
      console.log('🚨 WARNING: Your CONTACTS table is physically EMPTY in the database!');
    }
    
    await connection.end();
  } catch (e) {
    console.log(`Failed: ${e.message}`);
  }
}

checkCRM();
