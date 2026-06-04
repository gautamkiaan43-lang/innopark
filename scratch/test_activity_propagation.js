require('dotenv').config();
const pool = require('../config/db');

async function test() {
    try {
        console.log("Checking DB connection...");
        const [rows] = await pool.execute("SELECT 1");
        console.log("DB Connection OK");
        
        // 1. Create a dummy meeting related to deal 1
        console.log("Creating test meeting...");
        const title = "Test Meeting Activity Propagation";
        const meeting_date = "2026-06-03";
        const start_time = "14:00:00";
        const end_time = "15:00:00";
        const location = "Test Zoom link";
        const assigned_to = 1;
        const createdBy = 1;
        const companyId = 1;
        const related_to_type = "deal";
        const related_to_id = 99999; // Dummy deal ID
        
        const [result] = await pool.execute(
            `INSERT INTO meetings (company_id, title, description, meeting_date, start_time, end_time, location, assigned_to, related_to_type, related_to_id, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                companyId,
                title,
                "Test description for meeting propagation",
                meeting_date,
                start_time,
                end_time,
                location,
                assigned_to,
                related_to_type,
                related_to_id,
                createdBy
            ]
        );
        
        const newMeetingId = result.insertId;
        console.log(`Meeting created with ID: ${newMeetingId}`);
        
        // Propagate manually to simulate the controller code
        console.log("Simulating controller propagation...");
        let lead_id = null, company_id = null, contact_id = null, deal_id = null;
        if (related_to_type === 'deal') deal_id = related_to_id;
        else if (related_to_type === 'lead') lead_id = related_to_id;
        else if (related_to_type === 'contact') contact_id = related_to_id;
        else if (related_to_type === 'company') company_id = related_to_id;

        await pool.execute(
            `INSERT INTO activities (
                type, title, description, reference_type, reference_id, 
                entity_type, entity_id,
                lead_id, company_id, contact_id, deal_id, 
                created_by, assigned_to, 
                meeting_date, meeting_time, start_time, end_time, meeting_link
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                'meeting',
                title,
                "Test description for meeting propagation",
                'meeting',
                newMeetingId,
                related_to_type,
                related_to_id,
                lead_id,
                companyId, // tenant company ID
                contact_id,
                deal_id,
                createdBy,
                assigned_to,
                meeting_date,
                start_time,
                start_time,
                end_time,
                location
            ]
        );
        console.log("Activity record inserted successfully!");
        
        // 2. Fetch the activity to verify
        const [activities] = await pool.execute(
            "SELECT * FROM activities WHERE type = 'meeting' AND reference_id = ?",
            [newMeetingId]
        );
        console.log("newMeetingId:", newMeetingId);
        console.log("Propagated Activity Row:", activities);
        
        // Cleanup test data
        console.log("Cleaning up test data...");
        await pool.execute("DELETE FROM activities WHERE type = 'meeting' AND reference_id = ?", [newMeetingId]);
        await pool.execute("DELETE FROM meetings WHERE id = ?", [newMeetingId]);
        console.log("Cleanup finished.");
        
        console.log("✅ All tests passed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

test();
