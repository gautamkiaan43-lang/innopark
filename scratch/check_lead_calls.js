require('dotenv').config();
const pool = require('../config/db');

async function checkLeadCalls() {
  try {
    const [columns] = await pool.execute("SHOW COLUMNS FROM `lead_calls`");
    console.log("=== lead_calls COLUMNS ===");
    columns.forEach(c => {
      console.log(`${c.Field}: ${c.Type} | Null: ${c.Null} | Key: ${c.Key} | Default: ${c.Default}`);
    });
  } catch (err) {
    console.error("Error showing lead_calls columns:", err);
  }
  process.exit(0);
}

checkLeadCalls();
