const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration(migrationFile) {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'worksuite_db',
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true // Allow multiple statements
  });

  try {
    const filePath = path.join(__dirname, migrationFile);
    
    if (!fs.existsSync(filePath)) {
      console.error(`Migration file not found: ${filePath}`);
      process.exit(1);
    }

    console.log(`Reading migration file: ${migrationFile}`);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Remove comments and empty lines for cleaner execution
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`Executing ${statements.length} SQL statement(s)...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          console.log(`[${i + 1}/${statements.length}] Executing statement...`);
          await pool.execute(statement);
          console.log(`✓ Statement ${i + 1} executed successfully\n`);
        } catch (error) {
          // Check if it's a "duplicate column" or "duplicate key" error (already exists)
          if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME') {
            console.log(`⚠ Statement ${i + 1} skipped (already exists): ${error.message}\n`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('✓ Migration completed successfully!');
    
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node run-migration.js <migration-file.sql>');
  console.error('Example: node run-migration.js migrations/001_add_package_id_to_companies.sql');
  process.exit(1);
}

runMigration(migrationFile);

