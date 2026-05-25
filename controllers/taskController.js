const pool = require('../config/db');

// Helper to update overdue tasks
const updateProcessOverdue = async (companyId) => {
  try {
    await pool.execute(
      `UPDATE tasks SET status = 'Overdue' 
             WHERE status = 'Pending' AND due_date < NOW() AND company_id = ?`,
      [companyId]
    );
  } catch (e) {
    console.error('Error updating overdue tasks:', e);
  }
};

const getAll = async (req, res) => {
  try {
    const rawC = req.query.company_id ?? req.user?.company_id ?? req.body?.company_id;
    const companyIdNum =
      rawC != null && rawC !== '' ? parseInt(String(rawC), 10) : parseInt(String(req.user?.company_id || 1), 10);
    const companyId = Number.isFinite(companyIdNum) && companyIdNum > 0 ? companyIdNum : 1;
    const { assigned_to, status, priority, related_to_type, related_to_id, date_from, date_to, due_date, category, project_id, search, page = 1, limit = 50 } = req.query;

    // Default to ADMIN if no user, or handle safely
    const userRole = req.user?.role || 'ADMIN';
    const userId = req.user?.id || null;

    // Auto-update overdue status
    await updateProcessOverdue(companyId);

    let query = `
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
            WHERE t.company_id = ? AND t.is_deleted = 0
        `;
    const params = [companyId];

    const isPrivileged =
      String(userRole || '').toUpperCase() === 'ADMIN' ||
      String(userRole || '').toUpperCase() === 'SUPERADMIN';

    // Non-admins: tasks assigned to their user id, multi-assignee rows, or legacy employee-id assignment
    if (!isPrivileged && userId) {
      query += ` AND (
        t.assigned_to = ?
        OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?)
        OR EXISTS (
          SELECT 1 FROM employees e
          WHERE e.company_id = t.company_id AND e.user_id = ? AND e.id = t.assigned_to AND t.assigned_to IS NOT NULL
        )
      )`;
      params.push(userId, userId, userId);
    } else if (isPrivileged && assigned_to) {
      query += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }
    if (related_to_type) {
      query += ' AND t.related_to_type = ?';
      params.push(related_to_type);
    }
    if (related_to_id) {
      query += ' AND t.related_to_id = ?';
      params.push(related_to_id);
    }
    if (due_date) {
      query += ' AND DATE(t.due_date) = ?';
      params.push(due_date);
    }
    if (date_from) {
      query += ' AND DATE(t.due_date) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND DATE(t.due_date) <= ?';
      params.push(date_to);
    }
    if (category) {
      query += ' AND t.category = ?';
      params.push(category);
    }
    if (project_id) {
      query += ' AND (t.project_id = ? OR (t.related_to_type = \'project\' AND t.related_to_id = ?))';
      params.push(project_id, project_id);
    }

    const searchTrim = search != null && String(search).trim() ? String(search).trim() : '';
    if (searchTrim) {
      const pattern = `%${searchTrim}%`;
      query += ` AND (
        t.title LIKE ? OR IFNULL(t.description,'') LIKE ? OR t.code LIKE ?
        OR IFNULL(t.sub_description,'') LIKE ?
        OR IFNULL(p.project_name,'') LIKE ?
        OR IFNULL(u.name,'') LIKE ?
        OR IFNULL(u_emp.name,'') LIKE ?
        OR IFNULL(l.person_name,'') LIKE ?
        OR IFNULL(d.title,'') LIKE ?
        OR IFNULL(con.name,'') LIKE ?
        OR IFNULL(comp.name,'') LIKE ?
      )`;
      params.push(
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern
      );
    }

    // Pagination
    let pageNum = parseInt(page);
    let limitNum = parseInt(limit);
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 50;
    const offset = (pageNum - 1) * limitNum;

    query += ' ORDER BY t.is_pinned DESC, t.is_completed ASC, t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    let rows = null;
    try {
      [rows] = await pool.query(query, params);
    } catch (e) {
      console.warn('⚠️ Primary task query failed, trying fallbacks...', e.message);
    }

    if (!Array.isArray(rows)) {
      try {
        let simpleWhere = 't.company_id = ? AND t.is_deleted = 0';
        const simpleParams = [companyId];
        if (project_id) {
          simpleWhere += ' AND (t.project_id = ? OR (t.related_to_type = \'project\' AND t.related_to_id = ?))';
          simpleParams.push(project_id, project_id);
        } else {
          if (related_to_type) {
            simpleWhere += ' AND t.related_to_type = ?';
            simpleParams.push(related_to_type);
          }
          if (related_to_id) {
            simpleWhere += ' AND t.related_to_id = ?';
            simpleParams.push(related_to_id);
          }
        }
        if (searchTrim) {
          const pattern = `%${searchTrim}%`;
          simpleWhere +=
            ' AND (t.title LIKE ? OR IFNULL(t.description,\'\') LIKE ? OR t.code LIKE ?)';
          simpleParams.push(pattern, pattern, pattern);
        }
        const simpleSql = `SELECT t.*, NULL AS assigned_to_name, NULL AS assigned_to_avatar, NULL AS created_by_name, NULL AS related_entity_name, NULL AS project_name
          FROM tasks t
          WHERE ${simpleWhere}
          ORDER BY t.is_pinned DESC, t.is_completed ASC, t.created_at DESC
          LIMIT ? OFFSET ?`;
        simpleParams.push(limitNum, offset);
        const [simpleRows] = await pool.query(simpleSql, simpleParams);
        rows = simpleRows;
      } catch (e1) {
        console.warn('⚠️ Task fallback Level 1 failed:', e1.message);
        try {
          let s2Where = 't.company_id = ?';
          const s2Params = [companyId];
          if (project_id) {
            s2Where += ' AND (t.project_id = ? OR (t.related_to_type = \'project\' AND t.related_to_id = ?))';
            s2Params.push(project_id, project_id);
          } else {
            if (related_to_type) {
              s2Where += ' AND t.related_to_type = ?';
              s2Params.push(related_to_type);
            }
            if (related_to_id) {
              s2Where += ' AND t.related_to_id = ?';
              s2Params.push(related_to_id);
            }
          }
          if (searchTrim) {
            const pattern = `%${searchTrim}%`;
            s2Where +=
              ' AND (t.title LIKE ? OR IFNULL(t.description,\'\') LIKE ? OR t.code LIKE ?)';
            s2Params.push(pattern, pattern, pattern);
          }
          const s2Sql = `SELECT t.*, NULL AS assigned_to_name, NULL AS assigned_to_avatar, NULL AS created_by_name, NULL AS related_entity_name, NULL AS project_name
            FROM tasks t
            WHERE ${s2Where}
            ORDER BY t.is_pinned DESC, t.is_completed ASC, t.created_at DESC
            LIMIT ? OFFSET ?`;
          s2Params.push(limitNum, offset);
          const [s2Rows] = await pool.query(s2Sql, s2Params);
          rows = s2Rows;
        } catch (e2) {
          console.error('❌ All task fallbacks failed:', e2.message);
          throw e2;
        }
      }
    }

    // Count for pagination metadata
    let total = 0;
    try {
      const [countResult] = await pool.query('SELECT COUNT(*) as total FROM tasks WHERE company_id = ? AND is_deleted = 0', [companyId]);
      total = countResult[0]?.total || 0;
    } catch (e) {
      try {
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM tasks WHERE company_id = ?', [companyId]);
        total = countResult[0]?.total || 0;
      } catch (e2) {
        total = Array.isArray(rows) ? rows.length : 0;
      }
    }

    res.json({
      success: true,
      data: Array.isArray(rows) ? rows : [],
      pagination: {
        total: total,
        page: pageNum,
        limit: limitNum
      }
    });
  } catch (err) {
    console.error('Get tasks error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to retrieve tasks"
    });
  }
};


/**
 * Generate unique task code
 */
const generateTaskCode = async (companyId) => {
  try {
    const [result] = await pool.execute(
      `SELECT code FROM tasks WHERE company_id = ? ORDER BY id DESC LIMIT 1`,
      [companyId]
    );
    let nextNum = 1;
    if (result.length > 0 && result[0].code) {
      const match = result[0].code.match(/TSK-?(\d+)/i);
      if (match && match[1]) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    return `TSK-${String(nextNum).padStart(4, '0')}`;
  } catch (error) {
    return `TSK-${Date.now().toString().slice(-6)}`;
  }
};

/**
 * Check whether current user can mutate (edit/delete) a task.
 * Allows ADMIN/SUPERADMIN always, and for others:
 * - task creator
 * - directly assigned user (tasks.assigned_to = users.id)
 * - legacy employee-mapped assignment (tasks.assigned_to = employees.id where employees.user_id = user.id)
 * - multi-assignee mapping in task_assignees
 */
const canUserMutateTask = async ({ taskId, userId, userRole }) => {
  const role = String(userRole || '').toUpperCase();
  if (role === 'ADMIN' || role === 'SUPERADMIN') return true;
  if (!userId) return false;

  const [taskRows] = await pool.execute(
    'SELECT id, assigned_to, created_by, company_id FROM tasks WHERE id = ? LIMIT 1',
    [taskId]
  );
  if (!taskRows.length) return false;

  const task = taskRows[0];
  const assignedToNum = parseInt(String(task.assigned_to || ''), 10);
  const userIdNum = parseInt(String(userId), 10);

  if (task.created_by === userIdNum || assignedToNum === userIdNum) {
    return true;
  }

  // Legacy rows: tasks.assigned_to stores employees.id instead of users.id
  if (Number.isFinite(assignedToNum)) {
    const [legacyRows] = await pool.execute(
      'SELECT id FROM employees WHERE company_id = ? AND user_id = ? AND id = ? LIMIT 1',
      [task.company_id, userIdNum, assignedToNum]
    );
    if (legacyRows.length > 0) return true;
  }

  // Multi-assignee table
  const [assigneeRows] = await pool.execute(
    'SELECT id FROM task_assignees WHERE task_id = ? AND user_id = ? LIMIT 1',
    [taskId, userIdNum]
  );
  return assigneeRows.length > 0;
};

const create = async (req, res) => {
  try {
    const { title, description, due_date, priority, assigned_to, assign_to, employee, reminder_datetime, related_to_type, related_to_id, category, project_id, code } = req.body;
    const rawCo = req.body.company_id ?? req.query.company_id ?? req.user?.company_id ?? 1;
    const companyId = (() => {
      const n = parseInt(String(rawCo), 10);
      return Number.isFinite(n) && n > 0 ? n : 1;
    })();
    const createdBy = req.user?.id || 1;

    // Support assigned_to, assign_to, and employee from request body
    const inputAssignedTo = assigned_to !== undefined ? assigned_to : (assign_to !== undefined ? assign_to : employee);

    // Handle assigned_to if it comes as an array [id1, id2] or "[id1, id2]"
    let finalAssignedTo = inputAssignedTo;
    if (Array.isArray(inputAssignedTo)) {
      finalAssignedTo = inputAssignedTo[0];
    } else if (typeof inputAssignedTo === 'string' && inputAssignedTo.startsWith('[') && inputAssignedTo.endsWith(']')) {
      try {
        const parsed = JSON.parse(inputAssignedTo);
        if (Array.isArray(parsed)) finalAssignedTo = parsed[0];
      } catch (e) {
        finalAssignedTo = parseInt(inputAssignedTo.replace(/[\[\]]/g, ''), 10);
      }
    }
    
    // Convert to null if empty or invalid
    finalAssignedTo = (finalAssignedTo !== undefined && finalAssignedTo !== null && finalAssignedTo !== '') ? parseInt(String(finalAssignedTo), 10) : null;

    // Correct validation: check assigned_to
    if (!title || !finalAssignedTo) {
      return res.status(400).json({ 
        success: false, 
        error: "Title and Assigned Employee are required" 
      });
    }

    // Duplicate check: check if same title task already exists in the project
    const finalProjectId = project_id || (related_to_type === 'project' ? related_to_id : null);
    if (finalProjectId) {
      const [existing] = await pool.execute(
        `SELECT id FROM tasks WHERE title = ? AND project_id = ? AND is_deleted = 0 LIMIT 1`,
        [title.trim(), finalProjectId]
      );
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Task creation failed: A task with this title already exists in the project"
        });
      }
    }

    // Generate code if not provided
    const taskCode = code || await generateTaskCode(companyId);

    const [result] = await pool.execute(
      `INSERT INTO tasks (company_id, title, description, due_date, priority, assigned_to, reminder_datetime, related_to_type, related_to_id, category, project_id, created_by, code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        title.trim(),
        description || null,
        due_date || null,
        priority || 'Medium',
        finalAssignedTo,
        (reminder_datetime && reminder_datetime !== '') ? reminder_datetime : null,
        related_to_type || (finalProjectId ? 'project' : null),
        related_to_id || (finalProjectId ? finalProjectId : null),
        category || (finalProjectId ? 'Project' : 'CRM'),
        finalProjectId || null,
        createdBy,
        taskCode
      ]
    );

    const taskId = result.insertId;

    // Log project task timeline activity
    const finalLeadId = related_to_type === 'lead' ? related_to_id : null;
    const finalDealId = related_to_type === 'deal' ? related_to_id : null;
    const finalContactId = related_to_type === 'contact' ? related_to_id : null;
    const finalCompanyId = related_to_type === 'company' ? related_to_id : null;

    const refType = related_to_type || (finalProjectId ? 'project' : 'CRM');
    const refId = related_to_id || finalProjectId || null;

    const creatorName = req.user?.name || 'Admin';
    await pool.execute(
      `INSERT INTO activities (type, title, description, reference_type, reference_id, entity_type, entity_id, lead_id, deal_id, contact_id, company_id, created_by, is_completed)
       VALUES ('task', 'Task created', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        `${creatorName} created task: ${title}`,
        refType,
        refId,
        refType,
        refId,
        finalLeadId,
        finalDealId,
        finalContactId,
        finalCompanyId,
        createdBy
      ]
    );

    res.status(201).json({ success: true, id: taskId, message: "Task created successfully" });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role || 'EMPLOYEE';

    // Security Check: Task existence
    const [existing] = await pool.execute('SELECT assigned_to, created_by FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, error: "Task not found" });

    const canMutate = await canUserMutateTask({ taskId: id, userId, userRole });
    if (!canMutate) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied. You can only update your own tasks.'
      });
    }

    if (updates.hasOwnProperty('title') && (!updates.title || !updates.title.trim())) {
      return res.status(400).json({ success: false, error: "Title is required" });
    }

    if (updates.hasOwnProperty('assign_to') || updates.hasOwnProperty('assigned_to')) {
      const val = updates.assign_to !== undefined ? updates.assign_to : updates.assigned_to;
      if (val === null || val === '' || val === undefined) {
        return res.status(400).json({ success: false, error: "Assigned Employee is required" });
      }
    }

    const allowed = ['title', 'description', 'due_date', 'priority', 'status', 'assigned_to', 'assign_to', 'reminder_datetime', 'related_to_type', 'related_to_id', 'category', 'project_id', 'code', 'is_pinned', 'is_completed'];
    const fields = [];
    const values = [];

    for (const key of Object.keys(updates)) {
      if (allowed.includes(key) && updates[key] !== undefined) {
        let value = updates[key];
        
        // Handle assign_to or assigned_to
        if (key === 'assign_to' || key === 'assigned_to') {
          if (Array.isArray(value)) {
            value = value[0];
          } else if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) value = parsed[0];
            } catch (e) {
              value = parseInt(value.replace(/[\[\]]/g, ''), 10);
            }
          }
          const parsedVal = (value !== '' && value !== null && value !== undefined) ? parseInt(String(value), 10) : null;
          if (!fields.includes('assigned_to = ?')) {
            fields.push('assigned_to = ?');
            values.push(parsedVal);
          }
          continue;
        }

        // Handle empty strings for date fields
        if ((key === 'reminder_datetime' || key === 'due_date') && value === '') {
          value = null;
        }

        if (key === 'is_completed') {
          value = value ? 1 : 0;
          fields.push('status = ?');
          values.push(value === 1 ? 'Completed' : 'Pending');
        }

        if (key === 'status') {
          fields.push('is_completed = ?');
          values.push(value === 'Completed' || value === 'Done' ? 1 : 0);
        }

        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return res.status(400).json({ success: false, error: "No valid fields to update" });

    values.push(id);
    await pool.execute(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, message: "Task updated successfully" });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || 'EMPLOYEE';

    // Security Check: Task existence
    const [existing] = await pool.execute('SELECT assigned_to, created_by FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_e0214512') : "Task not found" });


    const canMutate = await canUserMutateTask({ taskId: id, userId, userRole });
    if (!canMutate) {
      return res.status(403).json({
        success: false,
        error: req.t ? req.t('api_msg_9f4e7f3f') : 'Permission denied. You can only delete your own tasks.'
      });
    }

    await pool.execute('UPDATE tasks SET is_deleted = 1 WHERE id = ?', [id]);
    res.json({ success: true, message: req.t ? req.t('api_msg_768e0b13') : "Task deleted successfully" });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const markComplete = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute("UPDATE tasks SET status = 'Completed', is_completed = 1 WHERE id = ?", [id]);
    res.json({ success: true, message: "Task marked as completed" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const reopen = async (req, res) => {
  try {
    const { id } = req.params;
    const [task] = await pool.execute('SELECT due_date FROM tasks WHERE id = ?', [id]);
    let status = 'Pending';
    if (task.length > 0 && task[0].due_date && new Date(task[0].due_date) < new Date()) {
      status = 'Overdue';
    }

    await pool.execute("UPDATE tasks SET status = ?, is_completed = 0 WHERE id = ?", [status, id]);
    res.json({ success: true, message: "Task reopened" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getAll, create, update, remove, markComplete, reopen };

