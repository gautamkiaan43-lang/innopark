require('dotenv').config();
const pool = require('../config/db');

async function checkAll() {
  const tables = ['contacts'];
  for (const table of tables) {
    try {
      const [columns] = await pool.execute(`DESCRIBE ${table}`);
      console.log(`\n=== Table: ${table} ===`);
      console.log(JSON.stringify(columns, null, 2));
    } catch (e) {
      console.log(`\n=== Table: ${table} does NOT exist or failed: ${e.message} ===`);
    }
  }
  process.exit(0);
}

checkAll();
