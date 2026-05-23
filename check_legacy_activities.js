require('dotenv').config();
const pool = require('./config/db');

async function main() {
    try {
        console.log("Checking for activities with conflicting mappings or legacy structure...");
        
        // Find any activity where entity_type and entity_id don't match the specific entity columns
        const [mismatches] = await pool.execute(`
            SELECT id, type, description, entity_type, entity_id, lead_id, company_id, contact_id, deal_id 
            FROM activities 
            WHERE is_deleted = 0
            AND (
                (entity_type = 'deal' AND (deal_id IS NULL OR entity_id != deal_id)) OR
                (entity_type = 'contact' AND (contact_id IS NULL OR entity_id != contact_id)) OR
                (entity_type = 'lead' AND (lead_id IS NULL OR entity_id != lead_id)) OR
                (entity_type = 'company' AND (company_id IS NULL OR entity_id != company_id))
            )
        `);
        
        console.log(`Found ${mismatches.length} mismatched activities:`, JSON.stringify(mismatches, null, 2));

        // Let's also check if there are any activities that have both deal_id and contact_id / lead_id set
        const [crossLinked] = await pool.execute(`
            SELECT id, type, description, entity_type, entity_id, lead_id, company_id, contact_id, deal_id
            FROM activities
            WHERE is_deleted = 0
            AND (
                (deal_id IS NOT NULL AND (contact_id IS NOT NULL OR lead_id IS NOT NULL)) OR
                (contact_id IS NOT NULL AND lead_id IS NOT NULL)
            )
        `);

        console.log(`Found ${crossLinked.length} cross-linked activities:`, JSON.stringify(crossLinked, null, 2));

        process.exit(0);
    } catch (e) {
        console.error("Error checking database:", e);
        process.exit(1);
    }
}
main();
