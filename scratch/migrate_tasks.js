const pool = require('../config/db');

async function migrate() {
  try {
    console.log('Starting migration for tasks table...');
    
    // Update status enum
    console.log('Updating status column...');
    await pool.execute(`
      ALTER TABLE tasks 
      MODIFY COLUMN status ENUM('Incomplete', 'Doing', 'Done', 'Pending', 'Overdue', 'Completed') 
      DEFAULT 'Pending'
    `);
    
    // Update related_to_type enum
    console.log('Updating related_to_type column...');
    await pool.execute(`
      ALTER TABLE tasks 
      MODIFY COLUMN related_to_type ENUM('lead', 'deal', 'contact', 'company', 'project') 
      NULL
    `);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
