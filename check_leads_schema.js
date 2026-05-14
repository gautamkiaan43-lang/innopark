require('dotenv').config();
const pool = require('./config/db');

async function checkLeadsSchema() {
  try {
    const [columns] = await pool.execute('DESCRIBE leads');
    console.log(JSON.stringify(columns, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkLeadsSchema();
