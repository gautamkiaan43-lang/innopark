require('dotenv').config();
const pool = require('../config/db');

async function check() {
  try {
    const [cols] = await pool.execute("DESCRIBE leads");
    console.log("leads columns:", cols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null })));
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

check();
