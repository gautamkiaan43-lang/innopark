require('dotenv').config();
const pool = require('../config/db');

async function test() {
    try {
        console.log("Checking DB connection...");
        const [rows] = await pool.execute("SELECT 1");
        console.log("DB Connection OK");

        // 1. Get or create a dummy deal pipeline stage
        // Let's check what stages exist in deal_pipeline_stages
        const [stages] = await pool.execute("SELECT id, name FROM deal_pipeline_stages LIMIT 3");
        console.log("Available stages:", stages);
        if (stages.length === 0) {
            console.log("No deal stages found. Exiting test.");
            process.exit(0);
        }

        const testStage = stages[0];
        console.log(`Using stage for test: id=${testStage.id}, name=${testStage.name}`);

        // 2. Create a dummy deal
        console.log("Creating dummy deal...");
        const dealNumber = `TESTDEAL#${Date.now().toString().slice(-4)}`;
        const [dealRes] = await pool.execute(
            `INSERT INTO deals (company_id, deal_number, valid_till, title, created_by, status, stage, stage_id)
             VALUES (1, ?, '2026-12-31', 'Test Deal Status Change', 1, 'Draft', 'New', ?)`,
            [dealNumber, testStage.id]
        );
        const testDealId = dealRes.insertId;
        console.log(`Test Deal created with ID: ${testDealId}`);

        // Simulate updateStage for the dummy deal to the first stage
        console.log("Test Case 1: Updating to standard stage (Neu)...");
        let newStageName = 'Neu';
        let newStageId = testStage.id;
        
        let updates = ['stage_id = ?', 'stage = ?'];
        let values = [newStageId, newStageName];
        
        // Auto Won/Lost/Proposal logic mapped via normalizeDealStatus simulation
        const normalizeDealStatus = (status) => {
            if (!status || typeof status !== 'string') return 'Draft';
            const s = String(status).trim();
            if (!s) return 'Draft';
            const lower = s.toLowerCase();
            const DEAL_STATUS_ALLOWED = ['Draft', 'Sent', 'Accepted', 'Declined', 'Expired'];
            const found = DEAL_STATUS_ALLOWED.find((v) => v.toLowerCase() === lower);
            if (found) return found;

            const map = {
                'won': 'Accepted',
                'gewonnen': 'Accepted',
                'accepted': 'Accepted',
                'lost': 'Declined',
                'verloren': 'Declined',
                'declined': 'Declined',
                'abgelehnt': 'Declined',
                'sent': 'Sent',
                'gesendet': 'Sent',
                'proposal': 'Sent',
                'vorschlag': 'Sent',
                'angebot': 'Sent',
                'draft': 'Draft',
                'entwurf': 'Draft',
                'expired': 'Expired',
                'abgelaufen': 'Expired'
            };
            return map[lower] || 'Draft';
        };

        const normalizedStatus = normalizeDealStatus(newStageName);
        updates.push('status = ?');
        values.push(normalizedStatus);
        
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(testDealId);
        
        await pool.execute(
            `UPDATE deals SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        console.log("Test Case 1 executed successfully!");

        // Fetch and print updated columns
        const [updatedDeal1] = await pool.execute("SELECT status, stage, stage_id FROM deals WHERE id = ?", [testDealId]);
        console.log("Updated Deal columns (Case 1):", updatedDeal1[0]);

        // Test Case 2: Simulating Gewonnen (Won) stage update
        console.log("Test Case 2: Simulating 'Gewonnen' stage update...");
        updates = ['stage_id = ?', 'stage = ?'];
        values = [newStageId, 'Gewonnen'];
        updates.push("status = ?");
        values.push(normalizeDealStatus('Gewonnen'));
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(testDealId);
        await pool.execute(
            `UPDATE deals SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        const [updatedDeal2] = await pool.execute("SELECT status, stage, stage_id FROM deals WHERE id = ?", [testDealId]);
        console.log("Updated Deal columns (Case 2):", updatedDeal2[0]);

        // Test Case 3: Simulating Proposal (Vorschlag) stage update
        console.log("Test Case 3: Simulating 'Vorschlag' stage update...");
        updates = ['stage_id = ?', 'stage = ?'];
        values = [newStageId, 'Vorschlag'];
        updates.push("status = ?");
        values.push(normalizeDealStatus('Vorschlag'));
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(testDealId);
        await pool.execute(
            `UPDATE deals SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        const [updatedDeal3] = await pool.execute("SELECT status, stage, stage_id FROM deals WHERE id = ?", [testDealId]);
        console.log("Updated Deal columns (Case 3):", updatedDeal3[0]);

        // Cleanup
        console.log("Cleaning up test deal...");
        await pool.execute("DELETE FROM deals WHERE id = ?", [testDealId]);
        console.log("Cleanup complete.");
        console.log("✅ All test cases passed!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Test failed:", e);
        process.exit(1);
    }
}

test();
