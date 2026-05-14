const pool = require('../config/db');

const getAll = async (req, res) => {
  try {
    const { year, month, start_date, end_date, lead_id, user_id, client_id, for_employee, for_client } = req.query;
    const companyId = req.query.company_id || req.body.company_id || 1;

    // No pagination - return all events
    let whereClause = 'WHERE e.is_deleted = 0';
    const params = [];

    // Add company_id filter only if provided
    if (companyId) {
      whereClause += ' AND e.company_id = ?';
      params.push(companyId);
    }

    // Filter by year and month if provided
    if (year && month) {
      const monthNum = parseInt(month); // 1-12 from frontend
      const yearNum = parseInt(year);
      const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
      const lastDay = new Date(yearNum, monthNum, 0).getDate();
      const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      whereClause += ' AND e.starts_on_date >= ? AND e.starts_on_date <= ?';
      params.push(startDate, endDate);
    } else if (start_date && end_date) {
      whereClause += ' AND e.starts_on_date >= ? AND e.starts_on_date <= ?';
      params.push(start_date, end_date);
    }

    // For employee dashboard - show events assigned to this employee OR all company events (for "all team" events)
    if (for_employee && user_id) {
      // Show events where employee is specifically assigned OR events with no specific assignments (all team)
      whereClause += ` AND (
        e.id IN (SELECT event_id FROM event_employees WHERE user_id = ?)
        OR e.id NOT IN (SELECT DISTINCT event_id FROM event_employees)
      )`;
      params.push(user_id);
    }

    // For client dashboard - show only events assigned to this client
    if (for_client && client_id) {
      whereClause += ` AND e.id IN (SELECT event_id FROM event_clients WHERE client_id = ?)`;
      params.push(client_id);
    }

    // Get all events without pagination
    const [events] = await pool.execute(
      `SELECT e.*, 
              u.name as host_name,
              u.email as host_email
       FROM events e
       LEFT JOIN users u ON e.host_id = u.id
       ${whereClause}
       ORDER BY e.starts_on_date ASC, e.starts_on_time ASC`,
      params
    );

    // Get departments, employees, and clients for each event
    for (let event of events) {
      // Get departments
      const [departments] = await pool.execute(
        `SELECT d.id, d.name as department_name 
         FROM event_departments ed
         JOIN departments d ON ed.department_id = d.id
         WHERE ed.event_id = ?`,
        [event.id]
      );
      event.departments = departments;

      // Get employees
      const [employees] = await pool.execute(
        `SELECT u.id, u.name, u.email 
         FROM event_employees ee
         JOIN users u ON ee.user_id = u.id
         WHERE ee.event_id = ?`,
        [event.id]
      );
      event.employees = employees;

      // Get clients
      const [clients] = await pool.execute(
        `SELECT c.id, c.company_name, u.email 
         FROM event_clients ec
         JOIN clients c ON ec.client_id = c.id
         LEFT JOIN users u ON c.owner_id = u.id
         WHERE ec.event_id = ?`,
        [event.id]
      );
      event.clients = clients;
    }

    console.log(`Fetched ${events.length} events for company ${companyId}, year ${year || 'all'}, month ${month || 'all'}`);
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get events error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_33825399') : "Failed to fetch events",
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

const create = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      event_name,
      label_color,
      where: whereLocation,
      description,
      start_date,
      start_time,
      starts_on_date,
      starts_on_time,
      end_date,
      end_time,
      ends_on_date,
      ends_on_time,
      department_ids,
      employee_ids,
      client_ids,
      select_employee,
      select_client,
      host_id,
      host,
      status,
      event_link,
      eventLink,
      lead_id,
      share_with,
      shareWith,
      labels,
      repeat
    } = req.body;

    // Use the correct field names (support both formats)
    const eventName = event_name || req.body.eventName;
    const leadId = lead_id || req.body.leadId || null;
    const labelColor = label_color || req.body.labelColor || '#FF0000';
    const location = whereLocation || req.body.where || req.body.location;
    const desc = description || req.body.description || null;
    const startDate = starts_on_date || start_date;
    const startTime = starts_on_time || start_time;
    const endDate = ends_on_date || end_date;
    const endTime = ends_on_time || end_time;
    const departments = department_ids || req.body.department || [];
    let employees = employee_ids || select_employee || [];
    let clients = client_ids || select_client || [];
    const userId = req.query.user_id || req.body.user_id || req.userId || req.user?.id || null;
    const companyId = req.query.company_id || req.body.company_id || req.companyId || 1;
    const eventStatus = status || 'Pending';
    const link = event_link || eventLink || null;
    const eventShareWith = share_with || shareWith || 'only_me';
    const eventLabels = labels || '';
    const eventRepeat = repeat || false;

    // Handle shareWith logic - if "all_team", get all employees
    if (eventShareWith === 'all_team') {
      try {
        const [allEmployees] = await connection.execute(
          `SELECT id FROM users WHERE company_id = ? AND role = 'EMPLOYEE' AND is_deleted = 0`,
          [companyId]
        );
        employees = allEmployees.map(e => e.id);
      } catch (err) {
        console.warn('Could not fetch all employees for all_team share:', err.message);
      }
    }

    if (!eventName || !location || !startDate || !startTime || !endDate || !endTime) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_d8db9bdb') : "Missing required fields: event_name, where, start_date, start_time, end_date, end_time"
      });
    }

    // Determine host_id - must be a valid numeric user ID
    let validHostId = null;

    // Try to get host_id from various sources
    const rawHostId = host_id || host;

    // If host_id is provided and is a valid number, validate it
    if (rawHostId && !isNaN(parseInt(rawHostId))) {
      const numericHostId = parseInt(rawHostId);
      const [hostCheck] = await connection.execute(
        `SELECT id FROM users WHERE id = ? AND company_id = ? AND is_deleted = 0`,
        [numericHostId, companyId]
      );
      if (hostCheck.length > 0) {
        validHostId = numericHostId;
      } else {
        console.warn(`host_id ${numericHostId} not found in company ${companyId}, will use userId as fallback`);
      }
    }

    // Fallback to userId if host_id is not valid
    if (!validHostId && userId && !isNaN(parseInt(userId))) {
      const numericUserId = parseInt(userId);
      const [userCheck] = await connection.execute(
        `SELECT id FROM users WHERE id = ? AND is_deleted = 0`,
        [numericUserId]
      );
      if (userCheck.length > 0) {
        validHostId = numericUserId;
      }
    }

    // Final hostId to use (can be null if no valid user found)
    const hostId = validHostId;

    // Get created_by - must not be null
    const effectiveCreatedBy = userId || req.userId || req.user?.id || 1;

    // Insert event - use NULL if hostId is not provided or invalid
    // Note: lead_id column requires database migration to be run first
    const [result] = await connection.execute(
      `INSERT INTO events (
        company_id, lead_id, event_name, label_color, \`where\`, description,
        starts_on_date, starts_on_time, ends_on_date, ends_on_time,
        host_id, status, event_link, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        leadId || null,
        eventName,
        labelColor,
        location || null,
        desc || null,
        startDate,
        startTime,
        endDate,
        endTime,
        hostId || null,
        eventStatus,
        link || null,
        effectiveCreatedBy
      ]
    );

    const eventId = result.insertId;

    // Insert departments
    if (departments && departments.length > 0) {
      try {
        for (const deptId of departments) {
          const numericDeptId = parseInt(deptId);
          if (!isNaN(numericDeptId) && numericDeptId > 0) {
            await connection.execute(
              'INSERT INTO event_departments (event_id, department_id) VALUES (?, ?)',
              [eventId, numericDeptId]
            );
          }
        }
      } catch (err) {
        console.warn('Error inserting departments, continuing without departments:', err.message);
      }
    }

    // Insert employees - validate user_ids exist before inserting
    // Wrap in try-catch so event creation doesn't fail if employees fail
    try {
      // Handle both array of IDs and array of objects
      let employeesArray = [];
      if (employees && Array.isArray(employees) && employees.length > 0) {
        employeesArray = employees
          .map(emp => {
            // If it's an object, extract id
            if (typeof emp === 'object' && emp !== null && emp !== undefined) {
              if (emp.id !== undefined && emp.id !== null) {
                return parseInt(emp.id);
              }
              return null;
            }
            // If it's already a number or string number
            if (emp !== null && emp !== undefined && emp !== '') {
              return parseInt(emp);
            }
            return null;
          })
          .filter(id => id !== null && !isNaN(id) && id > 0 && isFinite(id));
      }

      const employeesToAdd = [...new Set(employeesArray)];

      // If creator is employee and not already in list, add them (only if valid)
      const numericUserId = userId ? parseInt(userId) : null;
      if (numericUserId && !isNaN(numericUserId) && numericUserId > 0) {
        // Check if userId is already in list
        if (!employeesToAdd.includes(numericUserId)) {
          // Validate userId exists
          try {
            const [userCheck] = await connection.execute(
              `SELECT id FROM users WHERE id = ? AND is_deleted = 0`,
              [numericUserId]
            );
            if (userCheck.length > 0) {
              employeesToAdd.push(numericUserId);
            } else {
              console.warn(`Skipping userId ${numericUserId} - user does not exist`);
            }
          } catch (err) {
            console.warn(`Error checking userId ${numericUserId}:`, err.message);
          }
        }
      }

      // Validate and filter valid employee IDs - double check before insert
      const validEmployeeIds = [];
      for (const empId of employeesToAdd) {
        const numericEmpId = parseInt(empId);
        if (!isNaN(numericEmpId) && numericEmpId > 0) {
          try {
            // Check if user exists
            const [userExists] = await connection.execute(
              `SELECT id FROM users WHERE id = ? AND is_deleted = 0`,
              [numericEmpId]
            );
            if (userExists.length > 0) {
              validEmployeeIds.push(numericEmpId);
            } else {
              console.warn(`Skipping invalid employee_id: ${empId} (user does not exist)`);
            }
          } catch (err) {
            console.warn(`Error validating employee_id ${empId}:`, err.message);
          }
        } else {
          console.warn(`Skipping invalid employee_id format: ${empId}`);
        }
      }

      // Insert only valid employees with additional safety check
      if (validEmployeeIds.length > 0) {
        for (const empId of validEmployeeIds) {
          try {
            // Final validation before insert
            const [finalCheck] = await connection.execute(
              `SELECT id FROM users WHERE id = ? AND is_deleted = 0`,
              [empId]
            );

            if (finalCheck.length === 0) {
              console.warn(`Final check failed for employee_id ${empId} - skipping insert`);
              continue;
            }

            await connection.execute(
              'INSERT INTO event_employees (event_id, user_id) VALUES (?, ?)',
              [eventId, empId]
            );
          } catch (err) {
            // Skip if already exists (unique constraint)
            if (err.code === 'ER_DUP_ENTRY') {
              // Already exists, skip silently
              continue;
            }
            // For foreign key errors, log and skip
            if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
              console.error(`Foreign key error for employee ${empId}:`, err.message);
              continue;
            }
            // For other errors, log but don't throw
            console.error(`Error inserting employee ${empId} for event ${eventId}:`, err.message);
          }
        }
      }
    } catch (employeeError) {
      // Log error but don't fail event creation
      console.error('Error in employee insertion process:', employeeError.message);
      console.error('Event will be created without employees');
    }

    // Insert clients (if event_clients table exists)
    if (clients && clients.length > 0) {
      try {
        for (const clientId of clients) {
          await connection.execute(
            'INSERT INTO event_clients (event_id, client_id) VALUES (?, ?)',
            [eventId, clientId]
          );
        }
      } catch (err) {
        // event_clients table might not exist, skip
        console.log('event_clients table not found, skipping client assignment');
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      data: { id: eventId },
      message: req.t ? req.t('api_msg_92825f69') : "Event created successfully"
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create event'
    });
  } finally {
    connection.release();
  }
};

/**
 * Get event by ID
 * GET /api/v1/events/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.company_id || req.body.company_id || req.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }

    const [events] = await pool.execute(
      `SELECT e.*, 
              u.name as host_name,
              u.email as host_email
       FROM events e
       LEFT JOIN users u ON e.host_id = u.id
       WHERE e.id = ? AND e.company_id = ? AND e.is_deleted = 0`,
      [id, companyId]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_a3bf16d4') : "Event not found"
      });
    }

    const event = events[0];

    // Get departments
    const [departments] = await pool.execute(
      `SELECT d.id, d.name as department_name 
       FROM event_departments ed
       JOIN departments d ON ed.department_id = d.id
       WHERE ed.event_id = ?`,
      [event.id]
    );
    event.departments = departments;

    // Get employees
    const [employees] = await pool.execute(
      `SELECT u.id, u.name, u.email 
       FROM event_employees ee
       JOIN users u ON ee.user_id = u.id
       WHERE ee.event_id = ?`,
      [event.id]
    );
    event.employees = employees;

    // Get clients
    try {
      const [clients] = await pool.execute(
        `SELECT c.id, c.company_name, u.email 
         FROM event_clients ec
         JOIN clients c ON ec.client_id = c.id
         LEFT JOIN users u ON c.owner_id = u.id
         WHERE ec.event_id = ?`,
        [event.id]
      );
      event.clients = clients;
    } catch (err) {
      event.clients = [];
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_6a090efc') : "Failed to fetch event"
    });
  }
};

/**
 * Update event
 * PUT /api/v1/events/:id
 */
const update = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const companyId = req.query.company_id || req.body.company_id || req.companyId;
    const userId = req.query.user_id || req.body.user_id || req.userId;

    if (!companyId) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }

    // Check if event exists
    const [existing] = await connection.execute(
      `SELECT id FROM events WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, companyId]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_a3bf16d4') : "Event not found"
      });
    }

    const {
      event_name,
      label_color,
      where: whereLocation,
      description,
      starts_on_date,
      starts_on_time,
      ends_on_date,
      ends_on_time,
      host_id,
      status,
      event_link,
      department_ids,
      employee_ids,
      client_ids
    } = req.body;

    // Build update query
    const updates = [];
    const values = [];

    if (event_name !== undefined) {
      updates.push('event_name = ?');
      values.push(event_name);
    }
    if (label_color !== undefined) {
      updates.push('label_color = ?');
      values.push(label_color);
    }
    if (whereLocation !== undefined) {
      updates.push('`where` = ?');
      values.push(whereLocation);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (starts_on_date !== undefined) {
      updates.push('starts_on_date = ?');
      values.push(starts_on_date);
    }
    if (starts_on_time !== undefined) {
      updates.push('starts_on_time = ?');
      values.push(starts_on_time);
    }
    if (ends_on_date !== undefined) {
      updates.push('ends_on_date = ?');
      values.push(ends_on_date);
    }
    if (ends_on_time !== undefined) {
      updates.push('ends_on_time = ?');
      values.push(ends_on_time);
    }
    if (host_id !== undefined) {
      // Validate host_id is a valid number and exists in users table
      if (host_id && !isNaN(parseInt(host_id))) {
        const numericHostId = parseInt(host_id);
        const [hostCheck] = await connection.execute(
          `SELECT id FROM users WHERE id = ? AND company_id = ? AND is_deleted = 0`,
          [numericHostId, companyId]
        );
        if (hostCheck.length > 0) {
          updates.push('host_id = ?');
          values.push(numericHostId);
        } else {
          console.warn(`host_id ${numericHostId} not found in company ${companyId}, skipping update`);
        }
      } else if (host_id === null || host_id === '') {
        updates.push('host_id = ?');
        values.push(null);
      }
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (event_link !== undefined) {
      updates.push('event_link = ?');
      values.push(event_link);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      await connection.execute(
        `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    // Update departments if provided
    if (department_ids !== undefined) {
      await connection.execute('DELETE FROM event_departments WHERE event_id = ?', [id]);
      if (department_ids.length > 0) {
        for (const deptId of department_ids) {
          await connection.execute(
            'INSERT INTO event_departments (event_id, department_id) VALUES (?, ?)',
            [id, deptId]
          );
        }
      }
    }

    // Update employees if provided - validate user_ids exist
    if (employee_ids !== undefined) {
      await connection.execute('DELETE FROM event_employees WHERE event_id = ?', [id]);
      if (employee_ids.length > 0) {
        // Validate and filter valid employee IDs
        const validEmployeeIds = [];
        for (const empId of employee_ids) {
          const numericEmpId = parseInt(empId);
          if (!isNaN(numericEmpId) && numericEmpId > 0) {
            // Check if user exists
            const [userExists] = await connection.execute(
              `SELECT id FROM users WHERE id = ? AND is_deleted = 0`,
              [numericEmpId]
            );
            if (userExists.length > 0) {
              validEmployeeIds.push(numericEmpId);
            } else {
              console.warn(`Skipping invalid employee_id: ${empId} (user does not exist)`);
            }
          }
        }

        // Insert only valid employees
        for (const empId of validEmployeeIds) {
          try {
            await connection.execute(
              'INSERT INTO event_employees (event_id, user_id) VALUES (?, ?)',
              [id, empId]
            );
          } catch (err) {
            // Skip if already exists (unique constraint)
            if (err.code !== 'ER_DUP_ENTRY') {
              console.error(`Error inserting employee ${empId} for event ${id}:`, err.message);
            }
          }
        }
      }
    }

    // Update clients if provided
    if (client_ids !== undefined) {
      try {
        await connection.execute('DELETE FROM event_clients WHERE event_id = ?', [id]);
        if (client_ids.length > 0) {
          for (const clientId of client_ids) {
            await connection.execute(
              'INSERT INTO event_clients (event_id, client_id) VALUES (?, ?)',
              [id, clientId]
            );
          }
        }
      } catch (err) {
        // event_clients table might not exist
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_f335fa53') : "Event updated successfully"
    });
  } catch (error) {
    await connection.rollback();
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update event'
    });
  } finally {
    connection.release();
  }
};

/**
 * Delete event (soft delete)
 * DELETE /api/v1/events/:id
 */
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.company_id || req.body.company_id || req.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }

    const [result] = await pool.execute(
      `UPDATE events SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_a3bf16d4') : "Event not found"
      });
    }

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_67b303ad') : "Event deleted successfully"
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_6fb7a59a') : "Failed to delete event"
    });
  }
};

/**
 * Get upcoming events for user
 * GET /api/v1/events/upcoming
 */
const getUpcoming = async (req, res) => {
  try {
    const companyId = req.query.company_id || req.companyId;
    const userId = req.query.user_id || req.userId;
    const limit = parseInt(req.query.limit) || 5;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }

    const today = new Date().toISOString().split('T')[0];

    const [events] = await pool.execute(
      `SELECT e.*, 
              u.name as host_name
       FROM events e
       LEFT JOIN users u ON e.host_id = u.id
       WHERE e.company_id = ? 
         AND e.is_deleted = 0 
         AND e.starts_on_date >= ?
       ORDER BY e.starts_on_date ASC, e.starts_on_time ASC
       LIMIT ?`,
      [companyId, today, limit]
    );

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_fbe13fae') : "Failed to fetch upcoming events"
    });
  }
};

module.exports = { getAll, getById, create, update, delete: deleteEvent, getUpcoming };

