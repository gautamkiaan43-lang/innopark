const mysql = require('mysql2/promise');

async function testConnection(config, name) {
    try {
        console.log(`Testing ${name}...`);
        const pool = mysql.createPool(config);
        const [rows] = await pool.execute("SELECT id, type, description, entity_type, entity_id, contact_id, deal_id, lead_id FROM activities WHERE is_deleted = 0");
        console.log(`Success ${name}! Found activities count:`, rows.length);
        console.log("Activities:", JSON.stringify(rows.slice(0, 10), null, 2));
        await pool.end();
    } catch (e) {
        console.error(`Failed ${name}:`, e.message);
    }
}

async function main() {
    // Try metro
    await testConnection({
        host: 'metro.proxy.rlwy.net',
        port: 21605,
        user: 'root',
        password: 'VDKgeFdtyjYyEnahtqAbDMCoIEgkRULI',
        database: 'railway'
    }, 'metro-railway');

    // Try shuttle
    await testConnection({
        host: 'shuttle.proxy.rlwy.net',
        port: 32561,
        user: 'root',
        password: 'VDKgeFdtyjYyEnahtqAbDMCoIEgkRULI',
        database: 'railway'
    }, 'shuttle-railway');
}

main();
