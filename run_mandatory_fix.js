const path = require('path');
require('dotenv').config();

const pool = require('./config/db');
const fs = require('fs');

async function runFix() {
    console.log('🚀 Starting Mandatory Database Fix...');
    console.log(`🔌 Connecting to: ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || '3306'}`);
    
    // The SQL file is in ../database/MANDATORY_FIX_APRIL_28.sql
    const sqlPath = path.join(__dirname, '..', 'database', 'MANDATORY_FIX_APRIL_28.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error(`❌ SQL file not found at ${sqlPath}`);
        process.exit(1);
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    for (let statement of statements) {
        try {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await pool.query(statement);
        } catch (error) {
            if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY' || error.code === 'ER_DUP_FIELDNAME' || error.message.includes('already exists')) {
                console.log(`ℹ️ Skip: ${error.message}`);
            } else {
                console.error(`❌ Error executing statement:`, error.message);
            }
        }
    }

    console.log('✅ Mandatory Database Fix Completed!');
    process.exit(0);
}

runFix().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
