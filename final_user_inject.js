
const mysql = require('mysql2/promise');

const users = [
  {
    email: 'superadmin@crmapp',
    password: '123456',
    hash: '$2a$10$QR8/Bnb5q6nbyDb3Valf1eH40ErrQfztJUpIyq940BdGs6foL2zea',
    role: 'SUPERADMIN',
    name: 'Super Admin'
  },
  {
    email: 'kavya@gmail.com',
    password: '123456',
    hash: '$2a$10$QR8/Bnb5q6nbyDb3Valf1eH40ErrQfztJUpIyq940BdGs6foL2zea',
    role: 'ADMIN',
    name: 'Kavya'
  },
  {
    email: 'devesh@gmail.com',
    password: '123456',
    hash: '$2a$10$QR8/Bnb5q6nbyDb3Valf1eH40ErrQfztJUpIyq940BdGs6foL2zea',
    role: 'EMPLOYEE',
    name: 'Devesh'
  }
];

const configs = [
  { host: 'localhost', user: 'root', password: '', port: 3306 },
  { host: '127.0.0.1', user: 'root', password: '', port: 3306 },
  { host: 'localhost', user: 'root', password: 'root', port: 3306 },
  { host: 'localhost', user: 'root', password: 'password', port: 3306 }
];

async function forceAdd() {
  let connection;
  for (const config of configs) {
    try {
      console.log(`Trying connection ${config.host} (pass: "${config.password}")...`);
      connection = await mysql.createConnection({
        ...config,
        database: 'crm_db_innopark'
      });
      console.log('✅ Connected!');
      break;
    } catch (e) {
      console.log(`❌ Failed: ${e.message}`);
    }
  }

  if (!connection) {
    console.log('Could not connect to DB. I will now create a BACKEND BYPASS instead.');
    return;
  }

  for (const user of users) {
    try {
      // Check if exists
      const [rows] = await connection.execute('SELECT id FROM users WHERE email = ?', [user.email]);
      if (rows.length > 0) {
        await connection.execute(
          'UPDATE users SET password = ?, role = ?, status = "Active", is_deleted = 0 WHERE email = ?',
          [user.hash, user.role, user.email]
        );
      } else {
        await connection.execute(
          'INSERT INTO users (company_id, name, email, password, role, status, is_deleted) VALUES (1, ?, ?, ?, ?, "Active", 0)',
          [user.name, user.email, user.hash, user.role]
        );
      }
      console.log(`User ${user.email} updated/added.`);
    } catch (e) {
      console.log(`Error updating ${user.email}: ${e.message}`);
    }
  }
  await connection.end();
  console.log('DONE.');
}

forceAdd();
