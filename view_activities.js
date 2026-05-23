require('dotenv').config();
const pool = require('./config/db');

async function main() {
    try {
        const [rows] = await pool.execute('SELECT id, type, title, description, entity_type, entity_id, lead_id, company_id, contact_id, deal_id FROM activities WHERE is_deleted = 0');
        console.log('All Active Activities:', JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
