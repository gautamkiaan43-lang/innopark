require('dotenv').config();
const pool = require('../config/db');

async function describeDb() {
  const tables = ['leads', 'companies', 'clients', 'contacts', 'deals', 'deal_contacts', 'activities'];
  for (const table of tables) {
    try {
      const [columns] = await pool.execute(`SHOW COLUMNS FROM \`${table}\``);
      console.log(`\n=== Table: ${table} ===`);
      console.log(columns.map(c => `${c.Field} (${c.Type}) Null:${c.Null} Key:${c.Key} Default:${c.Default}`).join('\n'));
    } catch (err) {
      console.log(`Failed to show columns for table ${table}: ${err.message}`);
    }
  }
  process.exit(0);
}

describeDb();
