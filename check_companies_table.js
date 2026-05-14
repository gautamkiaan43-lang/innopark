const mysql = require('mysql2/promise');

async function checkCompanies() {
  const config = { host: '127.0.0.1', user: 'root', password: '', database: 'innopark_db', port: 3307 };
  try {
    const connection = await mysql.createConnection(config);
    const [c] = await connection.execute('SELECT * FROM companies');
    console.log(`Companies in total: ${c.length}`);
    console.table(c);
    await connection.end();
  } catch (e) {
    console.log(`Failed: ${e.message}`);
  }
}

checkCompanies();
