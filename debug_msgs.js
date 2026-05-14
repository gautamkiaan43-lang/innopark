require("dotenv").config({path: __dirname + "/.env"});
const mysql = require("mysql2/promise");

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "crm_db_innopark",
    port: parseInt(process.env.DB_PORT) || 3306,
  });

  try {
    const [users] = await pool.query("SELECT id, name, role, company_id FROM users");
    console.log("--- USERS ---");
    console.table(users);
    
    const [msgs] = await pool.query("SELECT id, from_user_id, to_user_id, company_id, message, is_read, is_deleted, group_id, created_at FROM messages ORDER BY created_at DESC LIMIT 20");
    console.log("--- LATEST 20 MESSAGES ---");
    console.table(msgs);

    const devesh = users.find(u => u.name && u.name.toLowerCase().includes("devesh"));
    if (devesh) {
      console.log(`--- MESSAGES INVOLVING DEVESH (ID: ${devesh.id}) ---`);
      const [devMsgs] = await pool.query(
        "SELECT * FROM messages WHERE from_user_id = ? OR to_user_id = ?",
        [devesh.id, devesh.id]
      );
      console.table(devMsgs);
    }

  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
