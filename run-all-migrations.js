/**
 * Run all SQL and JS migrations against the database from env.
 * - Railway: set DATABASE_URL or MYSQL_URL (or MYSQLHOST / MYSQLUSER / …)
 * - Local: copy .env.example → .env and set DB_*
 *
 * Usage:
 *   cd backend
 *   node run-all-migrations.js
 *
 * With Railway token (from project directory):
 *   npx @railway/cli run node run-all-migrations.js
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const DUP_OK = new Set([
  'ER_DUP_FIELDNAME',
  'ER_DUP_KEYNAME',
  'ER_DUP_ENTRY',
  'ER_TABLE_EXISTS',
  'ER_CANT_DROP_FIELD_OR_KEY',
]);

function isBenignError(err) {
  if (!err) return false;
  const code = err.code;
  const errno = err.errno;
  if (DUP_OK.has(code)) return true;
  // Common MySQL “already exists” codes
  if ([1007, 1050, 1051, 1060, 1061, 1062, 1091].includes(errno)) return true;
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('duplicate') && (msg.includes('column') || msg.includes('key') || msg.includes('name'))) return true;
  if (msg.includes('already exists')) return true;
  return false;
}

async function createConnectionRaw() {
  const uri = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (uri) {
    return mysql.createConnection({ uri, multipleStatements: true });
  }
  const host = process.env.MYSQLHOST || process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1';
  const user = process.env.MYSQLUSER || process.env.DB_USER || process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQLPASSWORD || process.env.DB_PASS || process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQLDATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE;
  const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10);
  if (!database) {
    throw new Error('Set DATABASE_URL, MYSQL_URL, or DB_NAME / MYSQLDATABASE for migrations.');
  }
  return mysql.createConnection({
    host,
    user,
    password,
    database,
    port,
    multipleStatements: true
  });
}

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(512) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_filename (filename(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function alreadyApplied(conn, filename) {
  const [rows] = await conn.query('SELECT 1 FROM schema_migrations WHERE filename = ? LIMIT 1', [filename]);
  return rows && rows.length > 0;
}

async function markApplied(conn, filename) {
  await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [filename]);
}

async function runSqlFile(conn, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  if (!sql.trim()) return;
  // Whole-file first (works for most dumps)
  try {
    await conn.query(sql);
    return;
  } catch (e) {
    if (isBenignError(e)) {
      console.warn('  ⚠ Full-file: benign error, trying statement split:', e.message);
    } else {
      console.warn('  ⚠ Full-file failed, splitting statements:', e.message);
    }
  }
  // Fallback: simple split (same idea as run-migration.js)
  const parts = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--') && !s.match(/^\/\*/));
  for (let i = 0; i < parts.length; i++) {
    const st = parts[i];
    if (!st) continue;
    try {
      await conn.query(st);
    } catch (err) {
      if (isBenignError(err)) {
        console.warn(`  ⚠ [${i + 1}/${parts.length}] skip (exists):`, err.message);
      } else {
        throw err;
      }
    }
  }
}

function runJsMigration(filePath) {
  const r = spawnSync(process.execPath, [filePath], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env },
    encoding: 'utf8'
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`JS migration exited with code ${r.status}: ${filePath}`);
  }
}

async function main() {
  let conn;
  try {
    conn = await createConnectionRaw();
    console.log('✅ Connected to database for migrations\n');
  } catch (e) {
    console.error('❌ Could not connect:', e.message);
    console.error('Set DATABASE_URL or MYSQL_URL (Railway) or DB_HOST / DB_NAME / etc.');
    process.exit(1);
  }

  try {
    await ensureMigrationsTable(conn);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql') || f.endsWith('.js'))
      .filter((f) => f !== 'README.md')
      .sort();

    if (files.length === 0) {
      console.log('No migration files found in migrations/');
      process.exit(0);
    }

    for (const file of files) {
      if (await alreadyApplied(conn, file)) {
        console.log(`⏭  Skip (already applied): ${file}`);
        continue;
      }

      const full = path.join(MIGRATIONS_DIR, file);
      console.log(`\n▶ Running: ${file}`);

      if (file.endsWith('.sql')) {
        try {
          await runSqlFile(conn, full);
          await markApplied(conn, file);
          console.log(`✅ Applied: ${file}`);
        } catch (e) {
          console.error(`❌ Failed: ${file}`, e.message);
          throw e;
        }
      } else {
        // Child process: JS files expect `node file.js` and their own `require('dotenv')` / `../config/db`
        try {
          runJsMigration(full);
          await markApplied(conn, file);
          console.log(`✅ Applied: ${file}`);
        } catch (e) {
          console.error(`❌ Failed: ${file}`, e.message);
          await conn.end();
          process.exit(1);
        }
      }
    }

    console.log('\n🎉 All migrations finished.');
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error('❌ run-all-migrations fatal:', e);
  process.exit(1);
});
