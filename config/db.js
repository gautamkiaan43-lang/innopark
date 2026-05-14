// =====================================================
// MySQL Database Configuration
// Production-ready: Uses environment variables
// Supports Railway, local dev, and any cloud MySQL
// =====================================================

const mysql = require('mysql2/promise');

let poolObject = null;
let originalExecute = null;
let originalQuery = null;

const createDbConfig = () => {
  const commonPoolSettings = {
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  };

  if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
    const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
    return { uri: dbUrl, ...commonPoolSettings };
  }

  const host = process.env.MYSQLHOST || process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1';
  const user = process.env.MYSQLUSER || process.env.DB_USER || process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQLPASSWORD || process.env.DB_PASS || process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQLDATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE || 'innopark_db';
  const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10);

  console.log(`🔌 Attempting DB connection: host=${host} port=${port} db=${database} user=${user}`);

  return {
    host,
    user,
    password,
    database,
    port,
    ...commonPoolSettings
  };
};

const initPool = async () => {
  try {
    const config = createDbConfig();
    const testPool = mysql.createPool(config);
    const conn = await testPool.getConnection();
    console.log(`✅ Database connected successfully!`);
    conn.release();

    poolObject = testPool;
    originalExecute = testPool.execute.bind(testPool);
    originalQuery = testPool.query.bind(testPool);
    return true;
  } catch (e) {
    console.error('❌ Database connection failed:', e.message);
    
    // Fallback for local development only
    if (process.env.NODE_ENV !== 'production') {
      const fallbackConfigs = [
        { host: '127.0.0.1', user: 'root', password: 'root', database: 'innopark_db', port: 3306 },
        { host: '127.0.0.1', user: 'root', password: '', database: 'innopark_db', port: 3306 },
        { host: '127.0.0.1', user: 'root', password: '', database: 'innopark_db', port: 3307 },
      ];

      for (const cfg of fallbackConfigs) {
        try {
          console.log(`🔄 Trying fallback: ${cfg.host}:${cfg.port} user=${cfg.user}`);
          const fallbackPool = mysql.createPool({ ...cfg, waitForConnections: true, connectionLimit: 10 });
          const conn = await fallbackPool.getConnection();
          console.log(`✅ Fallback connected successfully!`);
          conn.release();

          poolObject = fallbackPool;
          originalExecute = fallbackPool.execute.bind(fallbackPool);
          originalQuery = fallbackPool.query.bind(fallbackPool);
          return true;
        } catch (err) {
          // Silent fail for fallbacks
        }
      }
    }
    return false;
  }
};

// Initial setup attempt
initPool().catch(err => console.error('Immediate DB init error:', err));

const pool = {
  execute: async (sql, params = []) => {
    if (!originalExecute) {
      const success = await initPool();
      if (!success) {
        throw new Error('Database execute unavailable: connection not initialized. Check your .env file and MySQL server.');
      }
    }

    const modifiedParams = Array.isArray(params) ? [...params] : [params];

    try {
      return await originalExecute(sql, modifiedParams);
    } catch (err) {
      console.error('⚠️ DB Execute Error:', err.message);
      throw err;
    }
  },
  query: async (sql, params = []) => {
    if (!originalQuery) {
      const success = await initPool();
      if (!success) {
        throw new Error('Database query unavailable: connection not initialized. Check your .env file and MySQL server.');
      }
    }

    const modifiedParams = Array.isArray(params) ? [...params] : [params];

    try {
      return await originalQuery(sql, modifiedParams);
    } catch (err) {
      console.error('⚠️ DB Query Error:', err.message);
      throw err;
    }
  },
  getConnection: async () => {
    if (!poolObject) {
      const success = await initPool();
      if (!success) throw new Error('Database connection unavailable');
    }
    return poolObject.getConnection();
  }
};

module.exports = pool;

