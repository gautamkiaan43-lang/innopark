const pool = require('./config/db');

async function testProxy() {
    console.log('Testing Proxy with positional parameters...');
    try {
        // This simulates a query with company_id and another parameter
        // If my fix works, 'active' should NOT be replaced by 2, and the order should be preserved.
        const sql = 'SELECT * FROM contacts c WHERE c.is_deleted = 0 AND c.company_id = ? AND c.status = ?';
        const params = [1, 'active'];
        
        console.log('Original SQL:', sql);
        console.log('Original Params:', params);
        
        // We need to wait for pool to init
        setTimeout(async () => {
             const [rows] = await pool.execute(sql, params);
             console.log('Query result count:', rows.length);
             // If it worked, it should have used company_id=2 and status='active'
        }, 2000);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

testProxy();
