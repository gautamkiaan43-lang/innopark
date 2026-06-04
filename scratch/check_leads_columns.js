require('dotenv').config();
const pool = require('../config/db');

async function checkLeads() {
  try {
    const [columns] = await pool.execute("SHOW COLUMNS FROM `leads`");
    console.log("=== LEADS COLUMNS ===");
    columns.forEach(c => {
      console.log(`${c.Field}: ${c.Type} | Null: ${c.Null} | Key: ${c.Key} | Default: ${c.Default}`);
    });
  } catch (err) {
    console.error("Error showing leads columns:", err);
  }
  
  try {
    const [columns] = await pool.execute("SHOW COLUMNS FROM `activities`");
    console.log("\n=== ACTIVITIES COLUMNS ===");
    columns.forEach(c => {
      console.log(`${c.Field}: ${c.Type} | Null: ${c.Null} | Key: ${c.Key} | Default: ${c.Default}`);
    });
  } catch (err) {
    console.error("Error showing activities columns:", err);
  }

  process.exit(0);
}

checkLeads();
