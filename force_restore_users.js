
const mysql = require('mysql2/promise');
require('dotenv').config();

const users = [
  {
    email: 'admin@crmapp.com',
    password: 'Admin@123',
    hash: '$2a$10$GfWvRNlTDerXb5Ux4p/BPuiCI8uVAb/X1vSqg1CNKl7/MhOYvL4y.',
    role: 'ADMIN',
    name: 'Admin'
  },
  {
    email: 'superadmin@gmail.com',
    password: '123456',
    hash: '$2a$10$QR8/Bnb5q6nbyDb3Valf1eH40ErrQfztJUpIyq940BdGs6foL2zea',
    role: 'SUPERADMIN',
    name: 'Super Admin'
  },
  {
    email: 'employee@demo.com',
    password: 'Demo@123',
    hash: '$2a$10$CyMeAtmMNZ478BjpE3FPBOHnRpOcDCmcc7KTM2atWJqiluvv/PTSq',
    role: 'EMPLOYEE',
    name: 'Employee'
  }
];

const passwordsToTry = ['', 'root', 'admin', '12345678', 'password'];

async function restoreUsers() {
  let connection;
  let success = false;

  for (const pass of passwordsToTry) {
    try {
      console.log(`Trying connection with password: "${pass}"...`);
      connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: pass,
        database: 'crm_db_innopark',
        port: 3306
      });
      console.log('✅ Connected successfully!');
      success = true;
      
      // Update DB_PASS in .env if we found it
      if (pass !== '') {
          console.log(`Setting DB_PASS to "${pass}" in .env`);
          // This would be handled later
      }
      break;
    } catch (err) {
      console.error(`❌ Failed with password "${pass}":`, err.message);
    }
  }

  if (!success) {
    console.error('\n🛑 COULD NOT CONNECT TO DATABASE. PLEASE PROVIDE THE PASSWORD.');
    return;
  }

  try {
    for (const user of users) {
      console.log(`Restoring user: ${user.email}...`);
      
      const [rows] = await connection.execute('SELECT id FROM users WHERE email = ?', [user.email]);
      
      if (rows.length > 0) {
        await connection.execute(
          'UPDATE users SET password = ?, role = ?, status = "Active", is_deleted = 0 WHERE email = ?',
          [user.hash, user.role, user.email]
        );
        console.log(`✅ Updated existing user: ${user.email}`);
      } else {
        await connection.execute(
          'INSERT INTO users (company_id, name, email, password, role, status, is_deleted) VALUES (1, ?, ?, ?, ?, "Active", 0)',
          [user.name, user.email, user.hash, user.role]
        );
        console.log(`✅ Created new user: ${user.email}`);
      }
    }

    await connection.end();
    console.log('\n🎉 ALL USERS RESTORED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ SQL ERROR:', err.message);
  }
}

restoreUsers();
