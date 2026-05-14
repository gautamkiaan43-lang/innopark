const pool = require('./config/db');

async function checkRoles() {
  try {
    const [roles] = await pool.execute('SELECT * FROM roles');
    console.log('Roles:', JSON.stringify(roles, null, 2));
    
    const [moduleSettingsCols] = await pool.execute('SHOW COLUMNS FROM module_settings');
    console.log('module_settings columns:', JSON.stringify(moduleSettingsCols.map(c => c.Field), null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkRoles();
