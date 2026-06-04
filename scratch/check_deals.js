require('dotenv').config();
const pool = require('../config/db');

async function checkDeals() {
  try {
    const [rows] = await pool.execute("SELECT id, deal_number, title, is_deleted FROM deals ORDER BY id DESC LIMIT 50");
    console.log("=== LAST 50 DEALS ===");
    console.table(rows);

    const [dealNumRows] = await pool.execute(
      `SELECT deal_number FROM deals WHERE deal_number LIKE 'DEAL#%' ORDER BY LENGTH(deal_number) DESC, deal_number DESC LIMIT 1`
    );
    console.log("\nQuery result for latest deal number:");
    console.log(dealNumRows);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

checkDeals();
