const pool = require('./config/db');

async function checkCompanies() {
    try {
        const [columns] = await pool.execute('SHOW COLUMNS FROM companies');
        console.log('COLUMNS_START');
        console.log(JSON.stringify(columns, null, 2));
        console.log('COLUMNS_END');

        const [rows] = await pool.execute('SELECT * FROM companies LIMIT 5');
        console.log('ROWS_START');
        console.log(JSON.stringify(rows, null, 2));
        console.log('ROWS_END');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCompanies();
