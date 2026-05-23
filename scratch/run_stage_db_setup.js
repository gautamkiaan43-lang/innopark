require('dotenv').config();
const pool = require('../config/db');

async function main() {
    try {
        console.log('Starting Stage Changing Database Setup...');

        // 1. Create stage_history table
        console.log('Creating stage_history table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS stage_history (
                id INT PRIMARY KEY AUTO_INCREMENT,
                entity_type VARCHAR(50),
                entity_id INT,
                old_stage_id INT,
                new_stage_id INT,
                changed_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('stage_history table created.');

        // 2. Create lead_stages table
        console.log('Creating lead_stages table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lead_stages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255),
                color VARCHAR(50),
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('lead_stages table created.');

        // 3. Create deal_stages table
        console.log('Creating deal_stages table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS deal_stages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255),
                color VARCHAR(50),
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('deal_stages table created.');

        // 4. Populate lead_stages table if empty
        const [leadStagesCount] = await pool.query('SELECT COUNT(*) as count FROM lead_stages');
        if (leadStagesCount[0].count === 0) {
            console.log('Seeding lead_stages table...');
            const defaultLeadStages = [
                { name: 'New Lead', color: '#3B82F6', sort_order: 1 },
                { name: 'Email Inquiry', color: '#6366f1', sort_order: 2 },
                { name: 'Research', color: '#f59e0b', sort_order: 3 },
                { name: 'Qualified', color: '#8b5cf6', sort_order: 4 },
                { name: 'Converted', color: '#10b981', sort_order: 5 },
                { name: 'Lost', color: '#ef4444', sort_order: 6 }
            ];
            for (const stage of defaultLeadStages) {
                await pool.query('INSERT INTO lead_stages (name, color, sort_order) VALUES (?, ?, ?)', [stage.name, stage.color, stage.sort_order]);
            }
            console.log('lead_stages table seeded.');
        } else {
            console.log('lead_stages table already has data.');
        }

        // 5. Populate deal_stages table if empty
        const [dealStagesCount] = await pool.query('SELECT COUNT(*) as count FROM deal_stages');
        if (dealStagesCount[0].count === 0) {
            console.log('Seeding deal_stages table...');
            const defaultDealStages = [
                { name: 'New', color: '#3B82F6', sort_order: 1 },
                { name: 'Contacted', color: '#6366f1', sort_order: 2 },
                { name: 'Proposal', color: '#f59e0b', sort_order: 3 },
                { name: 'Negotiation', color: '#f97316', sort_order: 4 },
                { name: 'Won', color: '#10b981', sort_order: 5 },
                { name: 'Lost', color: '#ef4444', sort_order: 6 }
            ];
            for (const stage of defaultDealStages) {
                await pool.query('INSERT INTO deal_stages (name, color, sort_order) VALUES (?, ?, ?)', [stage.name, stage.color, stage.sort_order]);
            }
            console.log('deal_stages table seeded.');
        } else {
            console.log('deal_stages table already has data.');
        }

        // 6. Sync / Seed lead_pipeline_stages and deal_pipeline_stages so Kanban is updated
        console.log('Syncing pipeline stages for compatibility...');
        // Let's check pipelines in company 1 (since it's a common company_id, or we can check active pipelines)
        const [pipelines] = await pool.query('SELECT id FROM lead_pipelines WHERE is_deleted = 0');
        if (pipelines.length > 0) {
            const pipelineId = pipelines[0].id;
            console.log(`Using lead pipeline ID: ${pipelineId} for default stages`);
            // Insert standard stages if they don't exist
            const [existing] = await pool.query('SELECT name FROM lead_pipeline_stages WHERE pipeline_id = ? AND is_deleted = 0', [pipelineId]);
            const names = existing.map(e => e.name.toLowerCase());
            const stagesToSync = [
                { name: 'New Lead', color: '#3B82F6', display_order: 1 },
                { name: 'Email Inquiry', color: '#6366f1', display_order: 2 },
                { name: 'Research', color: '#f59e0b', display_order: 3 },
                { name: 'Qualified', color: '#8b5cf6', display_order: 4 },
                { name: 'Converted', color: '#10b981', display_order: 5 },
                { name: 'Lost', color: '#ef4444', display_order: 6 }
            ];
            for (const stage of stagesToSync) {
                if (!names.includes(stage.name.toLowerCase())) {
                    await pool.query('INSERT INTO lead_pipeline_stages (pipeline_id, name, display_order, color, is_default) VALUES (?, ?, ?, ?, 0)', [pipelineId, stage.name, stage.display_order, stage.color]);
                }
            }
        }

        const [dpipelines] = await pool.query('SELECT id FROM deal_pipelines WHERE is_deleted = 0');
        if (dpipelines.length > 0) {
            const dpipelineId = dpipelines[0].id;
            console.log(`Using deal pipeline ID: ${dpipelineId} for default stages`);
            // Insert standard stages if they don't exist
            const [existing] = await pool.query('SELECT name FROM deal_pipeline_stages WHERE pipeline_id = ? AND is_deleted = 0', [dpipelineId]);
            const names = existing.map(e => e.name.toLowerCase());
            const stagesToSync = [
                { name: 'New', color: '#3B82F6', display_order: 1 },
                { name: 'Contacted', color: '#6366f1', display_order: 2 },
                { name: 'Proposal', color: '#f59e0b', display_order: 3 },
                { name: 'Negotiation', color: '#f97316', display_order: 4 },
                { name: 'Won', color: '#10b981', display_order: 5 },
                { name: 'Lost', color: '#ef4444', display_order: 6 }
            ];
            for (const stage of stagesToSync) {
                if (!names.includes(stage.name.toLowerCase())) {
                    await pool.query('INSERT INTO deal_pipeline_stages (pipeline_id, name, display_order, color, is_default) VALUES (?, ?, ?, ?, 0)', [dpipelineId, stage.name, stage.display_order, stage.color]);
                }
            }
        }

        console.log('Database Setup successfully completed!');
        process.exit(0);
    } catch (e) {
        console.error('Database setup failed:', e);
        process.exit(1);
    }
}
main();
