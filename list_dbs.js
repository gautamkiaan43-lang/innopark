const mysql = require('mysql2/promise');

async function main() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            port: 3306
        });
        const [dbs] = await connection.query("SHOW DATABASES");
        console.log("Databases on localhost:3306:", dbs);
        await connection.end();
    } catch (e) {
        console.error("Error listing local databases:", e.message);
    }
}
main();
