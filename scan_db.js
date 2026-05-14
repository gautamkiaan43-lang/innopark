
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
  try {
    console.log('Trying port 3306...');
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'crm_db_innopark',
      port: 3306
    });

    const [rows] = await connection.execute('SELECT id, email, role FROM users');
    console.log('Users in DB (3306):');
    console.table(rows);
    await connection.end();
  } catch (err) {
    console.error('Error connecting to DB on 3306:', err.message);
    
    try {
      console.log('Trying port 3307...');
      const connection3307 = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'crm_db_innopark',
        port: 3307
      });
      const [rows3307] = await connection3307.execute('SELECT id, email, role FROM users');
      console.log('Users in DB (3307):');
      console.table(rows3307);
      await connection3307.end();
    } catch (err2) {
      console.error('Error connecting to DB on 3307:', err2.message);
      
      try {
        console.log('Trying DB name "crm_db" on 3306...');
        const connectionCrmDb = await mysql.createConnection({
          host: '127.0.0.1',
          user: 'root',
          password: '',
          database: 'crm_db',
          port: 3306
        });
        const [rowsCrmDb] = await connectionCrmDb.execute('SELECT id, email, role FROM users');
        console.log('Users in DB "crm_db" (3306):');
        console.table(rowsCrmDb);
        await connectionCrmDb.end();
      } catch (err3) {
        console.error('Error connecting to DB "crm_db":', err3.message);
      }
    }
  }
}

checkUsers();
