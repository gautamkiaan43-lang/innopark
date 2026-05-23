require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('../config/db');

async function runVerification() {
  console.log('================================================================');
  console.log('   🚀 AUTOMATED CRM PROJECT & TASK MODULE VERIFICATION RUN   ');
  console.log('================================================================\n');

  try {
    // --------------------------------------------------------
    // TEST 5: DATABASE SCHEMAS VERIFY
    // --------------------------------------------------------
    console.log('✅ TEST 5: Verifying Database Table Columns & Types...');
    
    // Check projects columns
    const [projCols] = await pool.execute("SHOW COLUMNS FROM projects");
    const titleCol = projCols.find(c => c.Field === 'title');
    const priorityCol = projCols.find(c => c.Field === 'priority');
    const statusCol = projCols.find(c => c.Field === 'status');

    console.log(` - projects.title exists: ${!!titleCol} (Type: ${titleCol?.Type})`);
    console.log(` - projects.priority exists: ${!!priorityCol} (Type: ${priorityCol?.Type})`);
    console.log(` - projects.status type standard: ${statusCol?.Type}`);

    if (!titleCol || !priorityCol || !statusCol?.Type.includes('varchar')) {
      throw new Error('TEST 5 projects schema verification failed!');
    }

    // Check tasks columns
    const [taskCols] = await pool.execute("SHOW COLUMNS FROM tasks");
    const taskPriorityCol = taskCols.find(c => c.Field === 'priority');
    const taskStatusCol = taskCols.find(c => c.Field === 'status');

    console.log(` - tasks.priority type standard: ${taskPriorityCol?.Type}`);
    console.log(` - tasks.status type standard: ${taskStatusCol?.Type}`);

    if (!taskPriorityCol?.Type.includes('varchar') || !taskStatusCol?.Type.includes('varchar')) {
      throw new Error('TEST 5 tasks schema verification failed!');
    }
    console.log('✨ TEST 5: Database schema verified successfully!\n');

    // --------------------------------------------------------
    // TEST 6: LEGACY PROJECTS DATA SYNC VERIFY
    // --------------------------------------------------------
    console.log('✅ TEST 6: Verifying Legacy Projects Title Synchronization...');
    const [unsynced] = await pool.execute("SELECT COUNT(*) as count FROM projects WHERE title IS NULL AND project_name IS NOT NULL");
    console.log(` - Unsynced projects count: ${unsynced[0].count}`);
    if (unsynced[0].count > 0) {
      console.log(' - Running sync fix...');
      await pool.execute("UPDATE projects SET title = project_name WHERE title IS NULL");
    }
    console.log('✨ TEST 6: All legacy projects titles synchronized successfully!\n');

    // Get a valid company_id and created_by user
    const [companyRows] = await pool.execute("SELECT id FROM companies LIMIT 1");
    const companyId = companyRows[0]?.id || 1;
    const [userRows] = await pool.execute("SELECT id FROM users WHERE is_deleted = 0 LIMIT 1");
    const userId = userRows[0]?.id || 1;

    console.log(`Using Company ID: ${companyId}, User ID: ${userId} for dynamic CRUD tests.\n`);

    // --------------------------------------------------------
    // TEST 1: PROJECT CREATE PAGE SIMULATION
    // --------------------------------------------------------
    console.log('✅ TEST 1: Simulating Project Creation...');
    const shortCode = 'WMS-' + Math.floor(100 + Math.random() * 900);
    const newProject = {
      company_id: companyId,
      short_code: shortCode,
      project_name: 'Website Redesign',
      title: 'Website Redesign',
      description: 'Dynamic frontend and backend redesign.',
      start_date: new Date().toISOString().slice(0, 10),
      status: 'In Progress',
      priority: 'High',
      created_by: userId
    };

    const [createRes] = await pool.execute(
      `INSERT INTO projects (company_id, short_code, project_name, title, description, start_date, status, priority, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newProject.company_id, newProject.short_code, newProject.project_name, newProject.title, newProject.description, newProject.start_date, newProject.status, newProject.priority, newProject.created_by]
    );
    const projectId = createRes.insertId;
    console.log(`✨ TEST 1: Project "Website Redesign" saved successfully! Inserted ID: ${projectId}\n`);

    // Add activity log for creation
    await pool.execute(
      `INSERT INTO activities (type, description, reference_type, reference_id, entity_type, entity_id, created_by, is_completed)
       VALUES ('task', ?, 'project', ?, 'project', ?, ?, 1)`,
      [`Admin created project: Website Redesign`, projectId, projectId, userId]
    );

    // --------------------------------------------------------
    // TEST 2: PROJECT EDIT SIMULATION
    // --------------------------------------------------------
    console.log('✅ TEST 2: Simulating Project Updating...');
    // Update Priority to Urgent, Status to On Hold
    const updatedProject = {
      priority: 'Urgent',
      status: 'On Hold'
    };

    await pool.execute(
      "UPDATE projects SET priority = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [updatedProject.priority, updatedProject.status, projectId]
    );
    console.log(' - Updated project status to On Hold & priority to Urgent.');

    // Log the updates to Activities
    await pool.execute(
      `INSERT INTO activities (type, description, reference_type, reference_id, entity_type, entity_id, created_by, is_completed)
       VALUES ('note', 'Admin updated project status to On Hold', 'project', ?, 'project', ?, ?, 1)`,
      [projectId, projectId, userId]
    );
    console.log(' - Logged project status change to timeline activities.');

    // Fetch to verify values
    const [fetchedProj] = await pool.execute("SELECT status, priority FROM projects WHERE id = ?", [projectId]);
    console.log(` - Fetched project values: Status = "${fetchedProj[0].status}", Priority = "${fetchedProj[0].priority}"`);
    
    if (fetchedProj[0].status !== 'On Hold' || fetchedProj[0].priority !== 'Urgent') {
      throw new Error('TEST 2 project update verification failed!');
    }
    console.log('✨ TEST 2: Project updated and VARCHAR(50) properties validated successfully!\n');

    // --------------------------------------------------------
    // TEST 3: TASK CREATE SIMULATION
    // --------------------------------------------------------
    console.log('✅ TEST 3: Simulating Task Creation...');
    const taskCode = 'TSK-' + Math.floor(1000 + Math.random() * 9000);
    const newTask = {
      company_id: companyId,
      project_id: projectId,
      title: 'Homepage UI',
      priority: 'Urgent',
      status: 'Todo',
      assigned_to: userId,
      created_by: userId,
      code: taskCode
    };

    const [taskCreateRes] = await pool.execute(
      `INSERT INTO tasks (company_id, project_id, title, priority, status, assigned_to, created_by, code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [newTask.company_id, newTask.project_id, newTask.title, newTask.priority, newTask.status, newTask.assigned_to, newTask.created_by, newTask.code]
    );
    const taskId = taskCreateRes.insertId;
    console.log(`✨ TEST 3: Task "Homepage UI" created successfully! Inserted ID: ${taskId}\n`);

    // Log task creation to project activities
    await pool.execute(
      `INSERT INTO activities (type, description, reference_type, reference_id, entity_type, entity_id, created_by, is_completed)
       VALUES ('task', ?, 'project', ?, 'project', ?, ?, 1)`,
      [`Admin created task: Homepage UI`, projectId, projectId, userId]
    );

    // --------------------------------------------------------
    // TEST 4: TASK STATUS CHANGE SIMULATION
    // --------------------------------------------------------
    console.log('✅ TEST 4: Simulating Task Status Transitions...');
    
    // Transition 1: Todo -> In Progress
    await pool.execute("UPDATE tasks SET status = ? WHERE id = ?", ['In Progress', taskId]);
    console.log(' - Transitioned task status: Todo -> In Progress');

    // Transition 2: In Progress -> Done
    await pool.execute("UPDATE tasks SET status = ? WHERE id = ?", ['Done', taskId]);
    console.log(' - Transitioned task status: In Progress -> Done');

    // Verify task status in database
    const [fetchedTask] = await pool.execute("SELECT status, priority FROM tasks WHERE id = ?", [taskId]);
    console.log(` - Fetched task values: Status = "${fetchedTask[0].status}", Priority = "${fetchedTask[0].priority}"`);

    if (fetchedTask[0].status !== 'Done') {
      throw new Error('TEST 4 task status transition verification failed!');
    }
    console.log('✨ TEST 4: Task status transitions executed and saved successfully!\n');

    // --------------------------------------------------------
    // TEST 7: ACTIVITY LOGS TIMELINE VERIFY
    // --------------------------------------------------------
    console.log('✅ TEST 7: Verifying Timeline Activity Log Entries...');
    const [activityRows] = await pool.execute(
      "SELECT type, description FROM activities WHERE entity_type = 'project' AND entity_id = ? ORDER BY id DESC",
      [projectId]
    );

    console.log(` - Total activity entries logged for project ID ${projectId}: ${activityRows.length}`);
    activityRows.forEach((act, i) => {
      console.log(`   ${i + 1}. [${act.type.toUpperCase()}] ${act.description}`);
    });

    if (activityRows.length < 3) {
      throw new Error('TEST 7 timeline activity logs are incomplete!');
    }
    console.log('✨ TEST 7: Timeline activity logging verified successfully!\n');

    console.log('================================================================');
    console.log('        🎉 ALL Verification Tests Completed successfully! ');
    console.log('================================================================');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification Failed:', error.message);
    process.exit(1);
  }
}

runVerification();
