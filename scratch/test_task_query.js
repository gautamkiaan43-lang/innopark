const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'innopark-db',
  port: parseInt(process.env.DB_PORT) || 3306
};

async function testQuery() {
  const pool = mysql.createPool(config);
  try {
    const query = `
            SELECT t.*, 
                   COALESCE(
                     u.name,
                     (SELECT uu.name FROM task_assignees taa 
                      INNER JOIN users uu ON taa.user_id = uu.id 
                      WHERE taa.task_id = t.id 
                      ORDER BY taa.id ASC LIMIT 1),
                     u_emp.name
                   ) as assigned_to_name, 
                   COALESCE(
                     u.avatar,
                     (SELECT uu.avatar FROM task_assignees taa 
                      INNER JOIN users uu ON taa.user_id = uu.id 
                      WHERE taa.task_id = t.id 
                      ORDER BY taa.id ASC LIMIT 1),
                     u_emp.avatar
                   ) as assigned_to_avatar,
                   c.name as created_by_name,
                   CASE 
                     WHEN t.related_to_type = 'lead' THEN l.person_name
                     WHEN t.related_to_type = 'deal' THEN d.title
                     WHEN t.related_to_type = 'contact' THEN con.name
                     WHEN t.related_to_type = 'company' THEN comp.name
                     WHEN t.related_to_type = 'project' THEN p.project_name
                     ELSE NULL
                   END as related_entity_name,
                   p.project_name as project_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            LEFT JOIN employees emp_assign ON emp_assign.id = t.assigned_to AND u.id IS NULL
            LEFT JOIN users u_emp ON u_emp.id = emp_assign.user_id
            LEFT JOIN users c ON t.created_by = c.id
            LEFT JOIN leads l ON t.related_to_type = 'lead' AND t.related_to_id = l.id
            LEFT JOIN deals d ON t.related_to_type = 'deal' AND t.related_to_id = d.id
            LEFT JOIN contacts con ON t.related_to_type = 'contact' AND t.related_to_id = con.id
            LEFT JOIN companies comp ON t.related_to_type = 'company' AND t.related_to_id = comp.id
            LEFT JOIN projects p ON (t.related_to_type = 'project' AND t.related_to_id = p.id) OR (t.project_id = p.id)
            WHERE t.company_id = 1 AND t.is_deleted = 0
            ORDER BY t.is_pinned DESC, t.is_completed ASC, t.created_at DESC
            LIMIT 50 OFFSET 0
    `;
    const [rows] = await pool.query(query);
    console.log(`Query succeeded with ${rows.length} rows.`);
  } catch (err) {
    console.error('Query failed:', err.message);
  } finally {
    await pool.end();
  }
}

testQuery();
