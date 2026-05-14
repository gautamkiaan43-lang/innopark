
const mysql = require('mysql2/promise');

async function listDBs() {
  const configs = [
    { host: 'localhost', user: 'root', password: '', port: 3306 },
    { host: '127.0.0.1', user: 'root', password: '', port: 3306 }
  ];

  for (const config of configs) {
    try {
      console.log(`Trying ${config.host}...`);
      const connection = await mysql.createConnection(config);
      const [rows] = await connection.execute('SHOW DATABASES');
      console.log('Databases found:');
      console.table(rows);
      await connection.end();
      return;
    } catch (e) {
      console.log(`Failed ${config.host}: ${e.message}`);
    }
  }
}

listDBs();
