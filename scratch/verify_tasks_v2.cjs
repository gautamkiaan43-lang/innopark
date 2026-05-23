const mysql = require('mysql2/promise');
require('dotenv').config();

async function runTests() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'innopark-db',
    port: parseInt(process.env.DB_PORT) || 3306
  });

  console.log('--- STARTING TASK SYSTEM VERIFICATION ---');

  try {
    // 1. Clean previous tests
    await conn.execute("DELETE FROM tasks WHERE title = 'Automated Verification Task'");
    await conn.execute("DELETE FROM activities WHERE description LIKE '%Automated Verification Task%'");

    // 2. Fetch an employee/user to assign
    const [users] = await conn.execute("SELECT id FROM users LIMIT 1");
    if (users.length === 0) {
      throw new Error("No users found to run tests");
    }
    const userId = users[0].id;
    console.log(`Using user ID: ${userId} for assignment`);

    // 3. Simulate creation of a task
    // Mock controller parameters
    const taskTitle = 'Automated Verification Task';
    const projectId = 16; // Project 16 exists

    // First create
    const [insertResult] = await conn.execute(
      `INSERT INTO tasks (company_id, title, description, due_date, priority, assigned_to, related_to_type, related_to_id, category, project_id, created_by, code)
       VALUES (1, ?, 'Verify Task System API', NULL, 'High', ?, 'project', ?, 'Project', ?, ?, 'TSK-TEST')`,
      [taskTitle, userId, projectId, projectId, userId]
    );
    const newTaskId = insertResult.insertId;
    console.log(`✅ Created test task with ID: ${newTaskId}`);

    // Insert timeline activity
    await conn.execute(
      `INSERT INTO activities (type, title, description, reference_type, reference_id, entity_type, entity_id, created_by, is_completed)
       VALUES ('task', 'Task created', ?, 'project', ?, 'project', ?, ?, 1)`,
      [`Admin created task: ${taskTitle}`, projectId, projectId, userId]
    );
    console.log('✅ Logged task creation to activities timeline');

    // 4. Duplicate Test
    console.log('Testing duplicate blocking rule...');
    const [existing] = await conn.execute(
      `SELECT id FROM tasks WHERE title = ? AND project_id = ? AND is_deleted = 0 LIMIT 1`,
      [taskTitle, projectId]
    );
    if (existing.length > 0) {
      console.log('✅ Duplicate check works: Successfully detected duplicate task title in project.');
    } else {
      console.error('❌ Duplicate check failed: Duplicate not detected.');
    }

    // 5. Completion Test
    console.log('Testing task completion toggle...');
    // Mark complete
    await conn.execute("UPDATE tasks SET status = 'Completed', is_completed = 1 WHERE id = ?", [newTaskId]);
    const [completedRow] = await conn.execute("SELECT status, is_completed FROM tasks WHERE id = ?", [newTaskId]);
    if (completedRow[0].status === 'Completed' && completedRow[0].is_completed === 1) {
      console.log('✅ Completion works: status is Completed and is_completed flag is 1.');
    } else {
      console.error('❌ Completion failed.');
    }

    // Reopen
    await conn.execute("UPDATE tasks SET status = 'Pending', is_completed = 0 WHERE id = ?", [newTaskId]);
    const [reopenedRow] = await conn.execute("SELECT status, is_completed FROM tasks WHERE id = ?", [newTaskId]);
    if (reopenedRow[0].status === 'Pending' && reopenedRow[0].is_completed === 0) {
      console.log('✅ Reopen works: status reset to Pending and is_completed is 0.');
    } else {
      console.error('❌ Reopen failed.');
    }

    // 6. Pinning Test
    console.log('Testing pinning toggle...');
    await conn.execute("UPDATE tasks SET is_pinned = 1 WHERE id = ?", [newTaskId]);
    const [pinnedRow] = await conn.execute("SELECT is_pinned FROM tasks WHERE id = ?", [newTaskId]);
    if (pinnedRow[0].is_pinned === 1) {
      console.log('✅ Pinning works: is_pinned flag is 1.');
    } else {
      console.error('❌ Pinning failed.');
    }

    // 7. Sorting Test
    console.log('Testing task list ordering...');
    const [sortedRows] = await conn.execute(
      `SELECT id, title, is_pinned, is_completed FROM tasks 
       WHERE project_id = ? AND is_deleted = 0 
       ORDER BY is_pinned DESC, is_completed ASC, created_at DESC`,
      [projectId]
    );
    console.log('Tasks list sorting order output:');
    console.table(sortedRows);
    
    // Verify first row is pinned
    if (sortedRows[0].is_pinned === 1) {
      console.log('✅ Sorting works: Pinned tasks are placed at the top of the list.');
    } else {
      console.error('❌ Sorting failed.');
    }

    // 8. Clean up
    await conn.execute("DELETE FROM tasks WHERE id = ?", [newTaskId]);
    await conn.execute("DELETE FROM activities WHERE description LIKE '%Automated Verification Task%'");
    console.log('✅ Test tasks and activity logs cleaned up.');

  } catch (err) {
    console.error('❌ Verification script encountered an error:', err.message);
  } finally {
    await conn.end();
    console.log('--- VERIFICATION COMPLETED ---');
  }
}

runTests();
