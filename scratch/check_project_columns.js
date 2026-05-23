require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('../config/db');

async function checkColumns() {
  try {
    const tables = ['projects', 'tasks', 'activities'];
    for (const table of tables) {
      try {
        const [cols] = await pool.execute(`SHOW COLUMNS FROM ${table}`);
        console.log(`\n=== Table: ${table} ===`);
        cols.forEach(c => {
          console.log(` - ${c.Field}: ${c.Type} (${c.Null === 'YES' ? 'NULLABLE' : 'NOT NULL'})`);
        });
      } catch (e) {
        console.error(`Error showing columns for ${table}:`, e.message);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Unhandled Error:', err);
    process.exit(1);
  }
}

checkColumns();
