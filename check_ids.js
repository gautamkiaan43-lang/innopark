const mysql = require('mysql2/promise');

async function checkIds() {
  const config = { host: '127.0.0.1', user: 'root', password: '', database: 'innopark_db', port: 3307 };
  try {
    const connection = await mysql.createConnection(config);
    const [p] = await connection.execute('SELECT id, project_name, company_id FROM projects');
    const [i] = await connection.execute('SELECT id, total, company_id FROM invoices');
    console.log('Projects:');
    console.table(p);
    console.log('Invoices:');
    console.table(i);
    await connection.end();
  } catch (e) {
    console.log(`Failed: ${e.message}`);
  }
}

checkIds();
