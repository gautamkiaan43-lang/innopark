require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('../config/db');

async function runMigration() {
  try {
    console.log('Starting Projects & Tasks CRM Migration...');

    // 1. Add title column to projects
    try {
      await pool.execute("ALTER TABLE `projects` ADD COLUMN `title` VARCHAR(255) NULL AFTER `short_code`");
      console.log(' - Added title column to projects table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log(' - title column already exists in projects');
      } else {
        throw e;
      }
    }

    // Sync title with project_name if title is null
    await pool.execute("UPDATE `projects` SET `title` = `project_name` WHERE `title` IS NULL");
    console.log(' - Synchronized project title values');

    // 2. Add priority column to projects
    try {
      await pool.execute("ALTER TABLE `projects` ADD COLUMN `priority` VARCHAR(50) DEFAULT 'Medium' AFTER `status`");
      console.log(' - Added priority column to projects table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log(' - priority column already exists in projects');
      } else {
        throw e;
      }
    }

    // 3. Alter projects status column to VARCHAR(50)
    await pool.execute("ALTER TABLE `projects` MODIFY COLUMN `status` VARCHAR(50) DEFAULT 'Not Started'");
    console.log(' - Standardized projects.status to VARCHAR(50)');

    // 4. Alter tasks status column to VARCHAR(50)
    await pool.execute("ALTER TABLE `tasks` MODIFY COLUMN `status` VARCHAR(50) DEFAULT 'Todo'");
    console.log(' - Standardized tasks.status to VARCHAR(50)');

    // 5. Alter tasks priority column to VARCHAR(50)
    await pool.execute("ALTER TABLE `tasks` MODIFY COLUMN `priority` VARCHAR(50) DEFAULT 'Medium'");
    console.log(' - Standardized tasks.priority to VARCHAR(50)');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
