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
    const [users] = await pool.query("SELECT id, name FROM users");
    console.log("Users:", users);
    
    const devesh = users.find(u => u.name && u.name.toLowerCase().includes("devesh"));
    
    // Default logged in user ID is likely 1 for Admin
    if (devesh) {
      await pool.query(
        "INSERT INTO messages (company_id, from_user_id, to_user_id, subject, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [1, devesh.id, 1, "Test", "hii", 0]
      );
      // Wait, is employee also going to see it? User asked to duplicate for employee dashboards too.
      // E.g. user ID 2 might be the employee? Let's insert for user 2 as well.
      await pool.query(
        "INSERT INTO messages (company_id, from_user_id, to_user_id, subject, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [1, devesh.id, 2, "Test", "hii", 0]
      );
      
      console.log("Inserted test message from Devesh to user 1 and user 2!");
    } else {
      console.log("Could not find Devesh.");
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
