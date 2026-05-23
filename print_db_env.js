require('dotenv').config();
const mysql = require('mysql2/promise');

const commonPoolSettings = {
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
};

const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
if (dbUrl) {
    console.log("DB config using URL:", dbUrl);
} else {
    const host = process.env.MYSQLHOST || process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1';
    const user = process.env.MYSQLUSER || process.env.DB_USER || process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQLPASSWORD || process.env.DB_PASS || process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
    const database = process.env.MYSQLDATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE || 'innopark_db';
    const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10);
    
    console.log("DB config:", { host, user, password, database, port });
}
