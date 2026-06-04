// Direct Railway production DB check
const mysql = require('mysql2/promise');

async function main() {
    let conn;
    try {
        // Try the railway proxy connection
        conn = await mysql.createConnection({
            host: 'shuttle.proxy.rlwy.net',
            port: 32561,
            user: 'root',
            password: 'VDKgeFdtyjYyEnahtqAbDMCoIEgkRULI',
            database: 'railway',
            connectTimeout: 30000,
            ssl: false
        });

        console.log('✅ Connected!');

        const [cols] = await conn.execute('DESCRIBE deals');
        console.log('\n=== DEALS TABLE ===');
        cols.forEach(c => {
            console.log(`  ${c.Field}: ${c.Type}  NULL=${c.Null}  Default=${c.Default}`);
        });

        const [sample] = await conn.execute('SELECT id, status, stage_id FROM deals LIMIT 3');
        console.log('\n=== SAMPLE DEALS ===', JSON.stringify(sample, null, 2));

        const [stages] = await conn.execute('SELECT id, name FROM deal_pipeline_stages LIMIT 10');
        console.log('\n=== STAGES ===', JSON.stringify(stages, null, 2));

    } catch(e) {
        console.error('❌ Error:', e.message, e.code);
    } finally {
        if (conn) { try { await conn.end(); } catch(e) {} }
        process.exit(0);
    }
}

main();
