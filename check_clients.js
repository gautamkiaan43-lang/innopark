const mysql = require('mysql2/promise');

async function checkClients() {
  const config = { host: '127.0.0.1', user: 'root', password: '', database: 'innopark_db', port: 3307 };
  try {
    const connection = await mysql.createConnection(config);
    const [c] = await connection.execute('SELECT * FROM clients WHERE company_id = 2');
    console.log(`Clients for Co 2: ${c.length}`);
    console.table(c);
    await connection.end();
  } catch (e) {
    console.log(`Failed: ${e.message}`);
  }
}

checkClients();
