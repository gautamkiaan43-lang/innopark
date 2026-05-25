const mysql = require('mysql2/promise');

const connections = [
  {
    name: "metro.proxy.rlwy.net:21605",
    host: "metro.proxy.rlwy.net",
    port: 21605,
    user: "root",
    password: "VDKgeFdtyjYyEnahtqAbDMCoIEgkRULI",
    database: "railway"
  },
  {
    name: "metro.proxy.rlwy.net:21605 (innopark-db)",
    host: "metro.proxy.rlwy.net",
    port: 21605,
    user: "root",
    password: "VDKgeFdtyjYyEnahtqAbDMCoIEgkRULI",
    database: "innopark-db"
  },
  {
    name: "shuttle.proxy.rlwy.net:32561",
    host: "shuttle.proxy.rlwy.net",
    port: 32561,
    user: "root",
    password: "VDKgeFdtyjYyEnahtqAbDMCoIEgkRULI",
    database: "railway"
  },
  {
    name: "shuttle.proxy.rlwy.net:32561 (innopark-db)",
    host: "shuttle.proxy.rlwy.net",
    port: 32561,
    user: "root",
    password: "VDKgeFdtyjYyEnahtqAbDMCoIEgkRULI",
    database: "innopark-db"
  }
];

async function run() {
  for (const connInfo of connections) {
    console.log(`\nTesting connection: ${connInfo.name}...`);
    try {
      const conn = await mysql.createConnection({
        host: connInfo.host,
        port: connInfo.port,
        user: connInfo.user,
        password: connInfo.password,
        database: connInfo.database,
        connectTimeout: 5000
      });
      console.log(`✅ SUCCESS connecting to ${connInfo.name}!`);
      
      const [dbRows] = await conn.execute("SHOW DATABASES");
      console.log("Databases:", dbRows.map(r => r.Database || r.database));
      
      const [tableRows] = await conn.execute("SHOW TABLES");
      console.log("Tables:", tableRows.map(r => Object.values(r)[0]));
      
      await conn.end();
    } catch (err) {
      console.error(`❌ FAILED connecting to ${connInfo.name}:`, err.message);
    }
  }
  process.exit(0);
}

run();
