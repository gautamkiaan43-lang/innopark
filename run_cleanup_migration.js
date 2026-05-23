require('dotenv').config();
const pool = require('./config/db');

async function main() {
    try {
        console.log("Executing strict entity alignment query...");
        await pool.execute(`
            UPDATE activities 
            SET 
              entity_type = CASE 
                WHEN deal_id IS NOT NULL THEN 'deal'
                WHEN contact_id IS NOT NULL THEN 'contact'
                WHEN lead_id IS NOT NULL THEN 'lead'
                WHEN company_id IS NOT NULL THEN 'company'
                ELSE entity_type
              END,
              entity_id = CASE 
                WHEN deal_id IS NOT NULL THEN deal_id
                WHEN contact_id IS NOT NULL THEN contact_id
                WHEN lead_id IS NOT NULL THEN lead_id
                WHEN company_id IS NOT NULL THEN company_id
                ELSE entity_id
              END
            WHERE is_deleted = 0
        `);

        console.log("Isolating Deal activities (clearing contact_id, lead_id, company_id)...");
        await pool.execute(`
            UPDATE activities
            SET contact_id = NULL, lead_id = NULL, company_id = NULL
            WHERE deal_id IS NOT NULL AND is_deleted = 0
        `);

        console.log("Isolating Contact activities (clearing deal_id, lead_id, company_id)...");
        await pool.execute(`
            UPDATE activities
            SET deal_id = NULL, lead_id = NULL, company_id = NULL
            WHERE contact_id IS NOT NULL AND is_deleted = 0
        `);

        console.log("Isolating Lead activities (clearing deal_id, contact_id, company_id)...");
        await pool.execute(`
            UPDATE activities
            SET deal_id = NULL, contact_id = NULL, company_id = NULL
            WHERE lead_id IS NOT NULL AND is_deleted = 0
        `);

        console.log("Migration executed successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

main();
