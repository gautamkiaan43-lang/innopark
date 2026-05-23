const mysql = require('mysql2/promise');

async function searchInDatabase(dbName) {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: dbName,
            port: 3306
        });

        // Get all tables
        const [tables] = await connection.query("SHOW TABLES");
        for (const tableRow of tables) {
            const tableName = Object.values(tableRow)[0];
            
            // Get columns of the table
            const [columns] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
            const textColumns = columns
                .filter(col => col.Type.includes('char') || col.Type.includes('text'))
                .map(col => col.Field);

            if (textColumns.length === 0) continue;

            // Build query to search for 'hgfd'
            const conditions = textColumns.map(col => `\`${col}\` LIKE ?`).join(' OR ');
            const query = `SELECT * FROM \`${tableName}\` WHERE ${conditions}`;
            const searchPattern = '%hgfd%';

            const [rows] = await connection.query(query, Array(textColumns.length).fill(searchPattern));
            if (rows.length > 0) {
                console.log(`Found match in database [${dbName}], table: ${tableName}`);
                console.log(JSON.stringify(rows, null, 2));
            }
        }
    } catch (e) {
        // Ignore errors for some system databases
    } finally {
        if (connection) await connection.end();
    }
}

async function main() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            port: 3306
        });
        const [dbs] = await connection.query("SHOW DATABASES");
        await connection.end();

        for (const dbRow of dbs) {
            const dbName = dbRow.Database;
            await searchInDatabase(dbName);
        }
        console.log("Global search completed!");
    } catch (e) {
        console.error("Global search error:", e.message);
    }
}

main();
