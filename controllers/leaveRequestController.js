// =====================================================
// Leave Request Controller
// =====================================================

const pool = require('../config/db');

// Ensure leave_requests table exists and has all required columns
const ensureTableExists = async () => {
  try {
    // Create table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT,
        user_id INT,
        leave_type VARCHAR(100),
        start_date DATE,
        end_date DATE,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        is_deleted TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_company (company_id),
        INDEX idx_user (user_id),
        INDEX idx_status (status)
      )
    `);

    // Add user_id only for legacy DBs. Blind ALTER causes MySQL to error; db.js logs every
    // execute() failure (and does not rethrow), so try/catch here never silences the log.
    const [colCheck] = await pool.execute(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leave_requests' AND COLUMN_NAME = 'user_id'`
    );
    if (Number(colCheck[0]?.c) === 0) {
      await pool.execute(
        `ALTER TABLE leave_requests ADD COLUMN user_id INT NULL AFTER company_id`
      );
    }

  } catch (error) {
    console.error('Error ensuring leave_requests table exists:', error);
  }
};

// Call once on module load
ensureTableExists();

/**
 * Get all leave requests
 * GET /api/v1/leave-requests
 */
const getAll = async (req, res) => {
  try {
    const filterCompanyId = req.query.company_id || req.body.company_id;
    const user_id = req.query.user_id || req.query.employee_id || req.userId;
    const status = req.query.status;
    const leave_type = req.query.leave_type;

    if (!filterCompanyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }

    let whereClause = 'WHERE lr.is_deleted = 0 AND lr.company_id = ?';
    const params = [filterCompanyId];

    // Filter by user_id
    if (user_id) {
      whereClause += ' AND lr.user_id = ?';
      params.push(user_id);
    }

    if (status) {
      whereClause += ' AND lr.status = ?';
      params.push(status);
    }

    if (leave_type) {
      whereClause += ' AND lr.leave_type = ?';
      params.push(leave_type);
    }

    // Simple query with user join and calculated days
    const [requests] = await pool.execute(
      `SELECT lr.id, lr.company_id, lr.user_id, lr.leave_type, 
              lr.start_date, lr.end_date, lr.reason, lr.status,
              lr.is_deleted, lr.created_at, lr.updated_at,
              DATEDIFF(lr.end_date, lr.start_date) + 1 as days,
              u.name as employee_name,
              u.email as employee_email
       FROM leave_requests lr
       LEFT JOIN users u ON lr.user_id = u.id
       ${whereClause}
       ORDER BY lr.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get leave requests error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_429500c7') : "Failed to fetch leave requests",
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Get leave request by ID
 * GET /api/v1/leave-requests/:id
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const filterCompanyId = req.query.company_id || req.companyId;
    const user_id = req.query.user_id || req.userId;

    let whereClause = 'WHERE lr.id = ? AND lr.is_deleted = 0';
    const params = [id];

    if (filterCompanyId) {
      whereClause += ' AND lr.company_id = ?';
      params.push(filterCompanyId);
    }

    // Filter by user_id if provided
    if (user_id) {
      whereClause += ' AND lr.user_id = ?';
      params.push(user_id);
    }

    const [requests] = await pool.execute(
      `SELECT lr.id, lr.company_id, lr.user_id, lr.leave_type, 
              lr.start_date, lr.end_date, lr.reason, lr.status,
              lr.is_deleted, lr.created_at, lr.updated_at,
              DATEDIFF(lr.end_date, lr.start_date) + 1 as days,
              u.name as employee_name,
              u.email as employee_email
       FROM leave_requests lr
       LEFT JOIN users u ON lr.user_id = u.id
       ${whereClause}`,
      params
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_2eb61ca8') : "Leave request not found"
      });
    }

    res.json({
      success: true,
      data: requests[0]
    });
  } catch (error) {
    console.error('Get leave request error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_04bf5e4c') : "Failed to fetch leave request"
    });
  }
};

/**
 * Create leave request
 * POST /api/v1/leave-requests
 */
const create = async (req, res) => {
  try {
    const {
      employee_id,
      user_id,
      leave_type,
      start_date,
      end_date,
      reason,
      status = 'Pending'
    } = req.body;

    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_6e1045a0') : "Leave type, start date, and end date are required"
      });
    }

    // Handle both company_id and Company_id (case insensitive)
    const companyId = req.body.company_id || req.body.Company_id || req.query.company_id;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e1be2bab') : "company_id is required"
      });
    }
    
    // Use user_id directly
    const finalUserId = user_id || employee_id;

    if (!finalUserId) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_99a26527') : "user_id is required"
      });
    }

    // Insert without days column (calculate dynamically when needed)
    const [result] = await pool.execute(
      `INSERT INTO leave_requests (
        company_id, user_id, leave_type, start_date, end_date,
        reason, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        companyId,
        finalUserId,
        leave_type,
        start_date,
        end_date,
        reason || null,
        status
      ]
    );

    // Return with calculated days
    const [newRequest] = await pool.execute(
      `SELECT *, DATEDIFF(end_date, start_date) + 1 as days 
       FROM leave_requests WHERE id = ?`,
      [result.insertId]
    );

    // If status is Approved, mark attendance as on_leave
    if (status && (status.toLowerCase() === 'approved' || status === 'Approved')) {
      await markAttendanceAsOnLeave(companyId, finalUserId, start_date, end_date);
    }

    res.status(201).json({
      success: true,
      data: newRequest[0],
      message: req.t ? req.t('api_msg_f16c9e3a') : "Leave request created successfully"
    });
  } catch (error) {
    console.error('Create leave request error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_2d6e11d3') : "Failed to create leave request",
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Update leave request
 * PUT /api/v1/leave-requests/:id
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      leave_type,
      start_date,
      end_date,
      reason,
      status,
      user_id
    } = req.body;

    const filterCompanyId = req.body.company_id || req.query.company_id;
    const userId = user_id || req.query.user_id || req.userId;

    // Check if request exists
    let whereClause = 'WHERE id = ? AND is_deleted = 0';
    const checkParams = [id];

    if (filterCompanyId) {
      whereClause += ' AND company_id = ?';
      checkParams.push(filterCompanyId);
    }

    const [existing] = await pool.execute(
      `SELECT * FROM leave_requests ${whereClause}`,
      checkParams
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_2eb61ca8') : "Leave request not found"
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (leave_type !== undefined) {
      updates.push('leave_type = ?');
      params.push(leave_type);
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(end_date);
    }
    if (reason !== undefined) {
      updates.push('reason = ?');
      params.push(reason);
    }
    // Allow status update (Admin can approve/reject)
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_003199ed') : "No fields to update"
      });
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    // Get the old status and new status to handle attendance marking
    const oldStatus = existing[0].status;
    const newStatus = status !== undefined ? status : oldStatus;
    const finalStartDate = start_date !== undefined ? start_date : existing[0].start_date;
    const finalEndDate = end_date !== undefined ? end_date : existing[0].end_date;
    const finalUserId = existing[0].user_id;
    const finalCompanyId = existing[0].company_id;

    await pool.execute(
      `UPDATE leave_requests SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // If status changed to Approved, mark attendance as on_leave
    if (newStatus && (newStatus.toLowerCase() === 'approved' || newStatus === 'Approved')) {
      if (oldStatus && oldStatus.toLowerCase() !== 'approved') {
        // Only mark if it wasn't already approved
        await markAttendanceAsOnLeave(finalCompanyId, finalUserId, finalStartDate, finalEndDate);
      } else if (start_date !== undefined || end_date !== undefined) {
        // If dates changed and it's already approved, update attendance
        await markAttendanceAsOnLeave(finalCompanyId, finalUserId, finalStartDate, finalEndDate);
      }
    } else if (newStatus && (newStatus.toLowerCase() === 'rejected' || newStatus === 'Rejected')) {
      // If rejected, remove on_leave status from attendance (if it was previously approved)
      if (oldStatus && oldStatus.toLowerCase() === 'approved') {
        await removeOnLeaveFromAttendance(finalCompanyId, finalUserId, finalStartDate, finalEndDate);
      }
    }

    // Return with calculated days
    const [updatedRequest] = await pool.execute(
      `SELECT *, DATEDIFF(end_date, start_date) + 1 as days 
       FROM leave_requests WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: updatedRequest[0],
      message: req.t ? req.t('api_msg_666eaf09') : "Leave request updated successfully"
    });
  } catch (error) {
    console.error('Update leave request error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_1f8528fd') : "Failed to update leave request"
    });
  }
};

/**
 * Helper function to mark attendance as on_leave for leave dates
 */
const markAttendanceAsOnLeave = async (companyId, userId, startDate, endDate) => {
  try {
    // Get employee_id from user_id
    const [employeeCheck] = await pool.execute(
      `SELECT id FROM employees WHERE user_id = ? AND company_id = ? LIMIT 1`,
      [userId, companyId]
    );

    if (employeeCheck.length === 0) {
      console.warn(`Employee not found for user_id: ${userId}, company_id: ${companyId}`);
      return;
    }

    const employeeId = employeeCheck[0].id;

    // Generate all dates between start_date and end_date
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }

    // Mark attendance as on_leave for each date
    for (const date of dates) {
      try {
        // Use INSERT ... ON DUPLICATE KEY UPDATE to handle both new and existing records
        await pool.execute(
          `INSERT INTO attendance (company_id, employee_id, user_id, date, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'on_leave', NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
             status = 'on_leave',
             updated_at = NOW()`,
          [companyId, employeeId, userId, date]
        );
      } catch (dateError) {
        // If the above fails, try checking and updating separately
        try {
          const [existing] = await pool.execute(
            `SELECT id FROM attendance WHERE employee_id = ? AND date = ? AND is_deleted = 0`,
            [employeeId, date]
          );

          if (existing.length > 0) {
            await pool.execute(
              `UPDATE attendance 
               SET status = 'on_leave', updated_at = NOW()
               WHERE id = ?`,
              [existing[0].id]
            );
          } else {
            // Try insert without ON DUPLICATE KEY (in case constraint doesn't exist)
            await pool.execute(
              `INSERT INTO attendance (company_id, employee_id, user_id, date, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, 'on_leave', NOW(), NOW())`,
              [companyId, employeeId, userId, date]
            );
          }
        } catch (fallbackError) {
          console.error(`Error marking attendance for date ${date}:`, fallbackError);
          // Continue with other dates even if one fails
        }
      }
    }

    console.log(`✅ Marked attendance as on_leave for user ${userId} from ${startDate} to ${endDate}`);
  } catch (error) {
    console.error('Error marking attendance as on_leave:', error);
    // Don't throw - we don't want to fail the leave update if attendance marking fails
  }
};

/**
 * Helper function to remove on_leave status from attendance when leave is rejected
 */
const removeOnLeaveFromAttendance = async (companyId, userId, startDate, endDate) => {
  try {
    // Get employee_id from user_id
    const [employeeCheck] = await pool.execute(
      `SELECT id FROM employees WHERE user_id = ? AND company_id = ? LIMIT 1`,
      [userId, companyId]
    );

    if (employeeCheck.length === 0) {
      return;
    }

    const employeeId = employeeCheck[0].id;

    // Remove on_leave status - set to absent or delete the record
    await pool.execute(
      `UPDATE attendance 
       SET status = 'absent', updated_at = NOW()
       WHERE employee_id = ? 
       AND date BETWEEN ? AND ?
       AND status = 'on_leave'
       AND is_deleted = 0`,
      [employeeId, startDate, endDate]
    );

    console.log(`✅ Removed on_leave status from attendance for user ${userId} from ${startDate} to ${endDate}`);
  } catch (error) {
    console.error('Error removing on_leave from attendance:', error);
  }
};

/**
 * Delete leave request (soft delete)
 * DELETE /api/v1/leave-requests/:id
 */
const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const filterCompanyId = req.query.company_id || req.companyId;
    const userId = req.query.user_id || req.userId;

    let whereClause = 'WHERE id = ? AND is_deleted = 0';
    const params = [id];

    if (filterCompanyId) {
      whereClause += ' AND company_id = ?';
      params.push(filterCompanyId);
    }

    // Filter by user_id (user can only delete their own)
    if (userId) {
      whereClause += ' AND user_id = ?';
      params.push(userId);
    }

    // Only allow deleting pending requests
    whereClause += ' AND status = ?';
    params.push('Pending');

    const [existing] = await pool.execute(
      `SELECT id FROM leave_requests ${whereClause}`,
      params
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_7925bd02') : "Leave request not found or cannot be deleted (only pending requests can be deleted)"
      });
    }

    await pool.execute(
      'UPDATE leave_requests SET is_deleted = 1, updated_at = NOW() WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_4f2bc56f') : "Leave request deleted successfully"
    });
  } catch (error) {
    console.error('Delete leave request error:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_83702033') : "Failed to delete leave request"
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteRequest
};

