require('dotenv').config();
const pool = require('./config/db');

async function main() {
    try {
        const [rows] = await pool.execute("SELECT id, type, description, entity_type, entity_id, contact_id, deal_id, lead_id, company_id FROM activities WHERE is_deleted = 0");
        console.log("Found activities:", JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error("Error checking database:", e);
        process.exit(1);
    }
}
main();
