const mysql = require('mysql2/promise');

async function main() {
  const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'innopark-db',
    port: 3306
  };

  try {
    const connection = await mysql.createConnection(config);
    console.log("Connected successfully to DB!");

    const [rows] = await connection.query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'innopark-db' AND COLUMN_NAME = 'type'
    `);
    
    console.log("\n=== Columns exactly named 'type' ===");
    for (const r of rows) {
      console.log(`Table: ${r.TABLE_NAME} | Column: ${r.COLUMN_NAME} | Type: ${r.COLUMN_TYPE} | Default: ${r.COLUMN_DEFAULT}`);
    }

    // Check specific columns of clients and activities
    const [actCols] = await connection.query("SHOW COLUMNS FROM activities");
    console.log("\n=== Activities Table Structure ===");
    for (const c of actCols) {
      console.log(`Field: ${c.Field} | Type: ${c.Type} | Null: ${c.Null} | Key: ${c.Key} | Default: ${c.Default}`);
    }

    const [clientCols] = await connection.query("SHOW COLUMNS FROM clients");
    console.log("\n=== Clients Table Structure ===");
    for (const c of clientCols) {
      console.log(`Field: ${c.Field} | Type: ${c.Type} | Null: ${c.Null} | Key: ${c.Key} | Default: ${c.Default}`);
    }

    await connection.end();
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
