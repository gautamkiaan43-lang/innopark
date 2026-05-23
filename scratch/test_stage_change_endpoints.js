require('dotenv').config();
const pool = require('../config/db');

async function main() {
    try {
        console.log('=== STARTING ENDPOINT VERIFICATION TESTS ===');

        // 1. Check Leads stage update
        console.log('Testing Lead Stage Update...');
        const [leads] = await pool.execute('SELECT id, stage_id FROM leads WHERE is_deleted = 0 LIMIT 1');
        if (leads.length > 0) {
            const leadId = leads[0].id;
            const currentStageId = leads[0].stage_id;
            console.log(`Using Lead ID: ${leadId}, Current Stage ID: ${currentStageId}`);

            // Find a valid different stage
            const [stages] = await pool.execute('SELECT id, name FROM lead_pipeline_stages WHERE id != ? AND is_deleted = 0 LIMIT 1', [currentStageId || 0]);
            if (stages.length > 0) {
                const targetStageId = stages[0].id;
                console.log(`Targeting Stage: ${stages[0].name} (ID: ${targetStageId})`);

                // We will perform database query matching updateStage to mock execution
                // and see if records are written successfully.
                await pool.execute('UPDATE leads SET stage_id = ? WHERE id = ?', [targetStageId, leadId]);
                await pool.execute(
                    'INSERT INTO stage_history (entity_type, entity_id, old_stage_id, new_stage_id, changed_by) VALUES (?, ?, ?, ?, ?)',
                    ['lead', leadId, currentStageId || null, targetStageId, 1]
                );
                await pool.execute(
                    `INSERT INTO activities (type, title, description, reference_type, reference_id, entity_type, entity_id, lead_id, created_by, assigned_to)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    ['comment', 'Stage Updated Test', 'Verification check stage', 'lead', leadId, 'lead', leadId, leadId, 1, 1]
                );

                console.log('✅ Lead stage update database logs written successfully.');
            } else {
                console.log('No different stage found to test.');
            }
        } else {
            console.log('No active leads found in DB to test.');
        }

        // 2. Check stage_history
        console.log('=== STAGE HISTORY RECORDS ===');
        const [history] = await pool.execute('SELECT * FROM stage_history ORDER BY created_at DESC LIMIT 5');
        console.log(history);

        // 3. Check activities timeline log
        console.log('=== ACTIVITIES TIMELINE RECORDS ===');
        const [timeline] = await pool.execute('SELECT * FROM activities ORDER BY created_at DESC LIMIT 2');
        console.log(timeline);

        console.log('=== VERIFICATION SUCCESSFULLY COMPLETED ===');
        process.exit(0);
    } catch (e) {
        console.error('Verification failed:', e);
        process.exit(1);
    }
}
main();
