require('dotenv').config();
const pool = require('../config/db');

async function main() {
    try {
        console.log('=== LEAD PIPELINES ===');
        const [pipelines] = await pool.execute('SELECT * FROM lead_pipelines');
        console.log(pipelines);

        console.log('=== LEAD STAGES ===');
        const [stages] = await pool.execute('SELECT * FROM lead_pipeline_stages');
        console.log(stages);

        console.log('=== DEAL PIPELINES ===');
        const [dpipelines] = await pool.execute('SELECT * FROM deal_pipelines');
        console.log(dpipelines);

        console.log('=== DEAL STAGES ===');
        const [dstages] = await pool.execute('SELECT * FROM deal_pipeline_stages');
        console.log(dstages);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
