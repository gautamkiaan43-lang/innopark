require('dotenv').config();
const pool = require('./config/db');

async function fixLeadsTable() {
  try {
    console.log('Checking leads table schema...');
    // We use pool.execute if available, but config/db might export a specific object
    const [columns] = await pool.execute('DESCRIBE leads');
    const hasCurrency = columns.some(col => col.Field === 'currency');
    
    if (!hasCurrency) {
      console.log('Adding currency column to leads table...');
      await pool.execute('ALTER TABLE leads ADD COLUMN currency VARCHAR(10) DEFAULT "EUR" AFTER value');
      console.log('Currency column added successfully.');
    } else {
      console.log('Currency column already exists.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing leads table:', error);
    process.exit(1);
  }
}

fixLeadsTable();
