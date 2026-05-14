const mysql = require('mysql2/promise');

async function checkAll() {
  const config = { host: '127.0.0.1', user: 'root', password: '', database: 'innopark_db', port: 3307 };
  try {
    const connection = await mysql.createConnection(config);
    const [p] = await connection.execute('SELECT COUNT(*) as total FROM projects');
    const [u] = await connection.execute('SELECT COUNT(*) as total FROM users');
    const [l] = await connection.execute('SELECT COUNT(*) as total FROM leads');
    const [i] = await connection.execute('SELECT COUNT(*) as total FROM invoices');
    console.log(`Summary: Projects(${p[0].total}), Users(${u[0].total}), Leads(${l[0].total}), Invoices(${i[0].total})`);
    await connection.end();
  } catch (e) {
    console.log(`Failed: ${e.message}`);
  }
}

checkAll();
