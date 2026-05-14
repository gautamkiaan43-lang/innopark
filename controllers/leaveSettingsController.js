const pool = require('../config/db');

// ================================================
// LEAVE SETTINGS CONTROLLER
// ================================================

/**
 * Ensure leave settings tables exist
 */
const ensureTablesExist = async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '../migrations/leave_settings_schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const statements = schema.split(';').filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'));
      
      for (const stmt of statements) {
        if (stmt.trim()) {
          try {
            await pool.query(stmt);
          } catch (e) {
            // Ignore table already exists errors
            if (!e.message.includes('already exists')) {
              console.warn('Migration warning:', e.message);
            }
          }
        }
      }
    }

    // Migrate existing leave_types table to new schema if needed
    try {
      const [columns] = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'leave_types'`
      );
      const columnNames = columns.map(col => col.COLUMN_NAME);

      // Add missing columns
      if (!columnNames.includes('allotment_type')) {
        await pool.query(`ALTER TABLE leave_types ADD COLUMN allotment_type ENUM('Monthly', 'Yearly') DEFAULT 'Yearly'`);
      }
      if (!columnNames.includes('total_leaves')) {
        await pool.query(`ALTER TABLE leave_types ADD COLUMN total_leaves INT DEFAULT 0`);
      }
      if (!columnNames.includes('monthly_limit')) {
        await pool.query(`ALTER TABLE leave_types ADD COLUMN monthly_limit INT DEFAULT 0`);
      }
      if (!columnNames.includes('paid_status')) {
        await pool.query(`ALTER TABLE leave_types ADD COLUMN paid_status ENUM('Paid', 'Unpaid') DEFAULT 'Paid'`);
      }
      if (!columnNames.includes('color_code')) {
        await pool.query(`ALTER TABLE leave_types ADD COLUMN color_code VARCHAR(20) DEFAULT '#3B82F6'`);
      }
      if (!columnNames.includes('allow_carry_forward')) {
        await pool.query(`ALTER TABLE leave_types ADD COLUMN allow_carry_forward TINYINT(1) DEFAULT 0`);
      }
      if (!columnNames.includes('max_carry_forward_limit')) {
        await pool.query(`ALTER TABLE leave_types ADD COLUMN max_carry_forward_limit INT DEFAULT 0`);
      }
      if (!columnNames.includes('is_active')) {
        try {
          await pool.query(`ALTER TABLE leave_types ADD COLUMN is_active TINYINT(1) DEFAULT 1`);
          console.log('Added is_active column to leave_types table');
          columnNames.push('is_active'); // Update local list
        } catch (e) {
          console.warn('Error adding is_active column:', e.message);
        }
      }
      if (!columnNames.includes('is_archived')) {
        try {
          await pool.query(`ALTER TABLE leave_types ADD COLUMN is_archived TINYINT(1) DEFAULT 0`);
          console.log('Added is_archived column to leave_types table');
          columnNames.push('is_archived'); // Update local list
        } catch (e) {
          console.warn('Error adding is_archived column:', e.message);
        }
      }

      // Migrate data from old columns to new if needed
      if (columnNames.includes('type_name') && !columnNames.includes('name')) {
        await pool.query(`ALTER TABLE leave_types CHANGE COLUMN type_name name VARCHAR(100) NOT NULL`);
      }
      if (columnNames.includes('no_of_leaves') && !columnNames.includes('total_leaves')) {
        await pool.query(`UPDATE leave_types SET total_leaves = no_of_leaves WHERE total_leaves = 0`);
      }
      if (columnNames.includes('is_paid')) {
        await pool.query(`UPDATE leave_types SET paid_status = IF(is_paid = 1, 'Paid', 'Unpaid') WHERE paid_status IS NULL`);
      }
      if (columnNames.includes('color') && !columnNames.includes('color_code')) {
        await pool.query(`UPDATE leave_types SET color_code = color WHERE color_code IS NULL OR color_code = '#3B82F6'`);
      }
      if (columnNames.includes('period')) {
        await pool.query(`UPDATE leave_types SET allotment_type = IF(period = 'monthly', 'Monthly', 'Yearly') WHERE allotment_type IS NULL`);
      }
    } catch (e) {
      console.warn('Migration warning:', e.message);
    }
  } catch (error) {
    console.error('Error ensuring tables exist:', error);
    // Don't throw - continue execution
  }
};

// ================================================
// LEAVE TYPES
// ================================================

/**
 * GET /api/leave-settings/leave-types
 * Get all leave types (active and archived separately)
 */
exports.getAllLeaveTypes = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { company_id } = req.query;
    const { include_archived } = req.query;

    console.log('=== GET ALL LEAVE TYPES REQUEST ===');
    console.log('Company ID:', company_id);
    console.log('Include Archived:', include_archived);

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    // Check if is_deleted column exists
    let hasIsDeletedColumn = false;
    let hasArchivedColumn = false;
    try {
      const [columns] = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'leave_types'`
      );
      const columnNames = columns.map(col => col.COLUMN_NAME);
      hasIsDeletedColumn = columnNames.includes('is_deleted');
      hasArchivedColumn = columnNames.includes('is_archived');
      console.log('Has is_deleted column:', hasIsDeletedColumn);
      console.log('Has is_archived column:', hasArchivedColumn);
    } catch (e) {
      console.warn('Error checking columns:', e.message);
    }

    let whereClause = 'WHERE company_id = ?';
    const params = [company_id];

    // Add is_deleted filter if column exists
    if (hasIsDeletedColumn) {
      whereClause += ' AND is_deleted = 0';
    }

    // Only use is_archived filter if column exists
    if (hasArchivedColumn) {
      const includeArchived = include_archived === 'true' || include_archived === true;
      if (includeArchived) {
        whereClause += ' AND is_archived = 1';
      } else {
        whereClause += ' AND (is_archived = 0 OR is_archived IS NULL)';
      }
    }

    console.log('SQL Query:', `SELECT * FROM leave_types ${whereClause} ORDER BY created_at DESC`);
    console.log('Params:', params);

    const [leaveTypes] = await pool.query(
      `SELECT * FROM leave_types ${whereClause} ORDER BY created_at DESC`,
      params
    );

    console.log('Total leave types found:', leaveTypes.length);

    // Get departments and designations for each leave type
    for (let leaveType of leaveTypes) {
      try {
        const [departments] = await pool.query(
          `SELECT d.id, d.name 
           FROM departments d
           INNER JOIN leave_type_departments ltd ON d.id = ltd.department_id
           WHERE ltd.leave_type_id = ? ${hasIsDeletedColumn ? 'AND d.is_deleted = 0' : ''}`,
          [leaveType.id]
        );

        const [designations] = await pool.query(
          `SELECT p.id, p.name 
           FROM positions p
           INNER JOIN leave_type_designations ltd ON p.id = ltd.designation_id
           WHERE ltd.leave_type_id = ? ${hasIsDeletedColumn ? 'AND p.is_deleted = 0' : ''}`,
          [leaveType.id]
        );

        leaveType.departments = departments || [];
        leaveType.designations = designations || [];
      } catch (e) {
        console.warn(`Error fetching relations for leave type ${leaveType.id}:`, e.message);
        leaveType.departments = [];
        leaveType.designations = [];
      }
    }

    res.json({
      success: true,
      data: leaveTypes
    });
  } catch (error) {
    console.error('Error fetching leave types:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_36ca3f00') : "Failed to fetch leave types",
      details: error.message
    });
  }
};

/**
 * GET /api/leave-settings/leave-types/:id
 * Get single leave type by ID
 */
exports.getLeaveTypeById = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { id } = req.params;
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    const [leaveTypes] = await pool.query(
      `SELECT * FROM leave_types WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, company_id]
    );

    if (leaveTypes.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_5144118e') : "Leave type not found"
      });
    }

    const leaveType = leaveTypes[0];

    // Get departments and designations
    const [departments] = await pool.query(
      `SELECT d.id, d.name 
       FROM departments d
       INNER JOIN leave_type_departments ltd ON d.id = ltd.department_id
       WHERE ltd.leave_type_id = ? AND d.is_deleted = 0`,
      [id]
    );

    const [designations] = await pool.query(
      `SELECT p.id, p.name 
       FROM positions p
       INNER JOIN leave_type_designations ltd ON p.id = ltd.designation_id
       WHERE ltd.leave_type_id = ? AND p.is_deleted = 0`,
      [id]
    );

    leaveType.departments = departments;
    leaveType.designations = designations;

    res.json({
      success: true,
      data: leaveType
    });
  } catch (error) {
    console.error('Error fetching leave type:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_589f1f64') : "Failed to fetch leave type",
      details: error.message
    });
  }
};

/**
 * POST /api/leave-settings/leave-types
 * Create a new leave type
 */
exports.createLeaveType = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { company_id } = req.query;
    const leaveTypeData = req.body;

    console.log('=== CREATE LEAVE TYPE REQUEST ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Query params:', req.query);
    console.log('Company ID:', company_id);
    console.log('Request body:', JSON.stringify(leaveTypeData, null, 2));
    console.log('Headers:', JSON.stringify(req.headers, null, 2));

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    // Validate required fields
    if (!leaveTypeData.name || !leaveTypeData.name.trim()) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_79349eee') : "Leave type name is required"
      });
    }

    if (!leaveTypeData.allotment_type) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_a71607e8') : "Leave allotment type is required"
      });
    }

    const dbData = {
      company_id: company_id,
      name: leaveTypeData.name.trim(),
      allotment_type: leaveTypeData.allotment_type || 'Yearly',
      total_leaves: parseInt(leaveTypeData.total_leaves) || 0,
      monthly_limit: parseInt(leaveTypeData.monthly_limit) || 0,
      paid_status: leaveTypeData.paid_status || 'Paid',
      color_code: leaveTypeData.color_code || '#3B82F6',
      allow_carry_forward: leaveTypeData.allow_carry_forward ? 1 : 0,
      max_carry_forward_limit: parseInt(leaveTypeData.max_carry_forward_limit) || 0,
      is_active: leaveTypeData.is_active !== undefined ? (leaveTypeData.is_active ? 1 : 0) : 1,
      is_archived: 0
    };

    console.log('DB Data to insert:', dbData);

    // Check if is_deleted column exists
    let hasIsDeletedColumn = false;
    try {
      const [columns] = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'leave_types' 
         AND COLUMN_NAME = 'is_deleted'`
      );
      hasIsDeletedColumn = columns.length > 0;
      if (!hasIsDeletedColumn) {
        // Remove is_deleted from dbData if column doesn't exist
        delete dbData.is_deleted;
      } else {
        dbData.is_deleted = 0;
      }
    } catch (e) {
      console.warn('Error checking is_deleted column:', e.message);
    }

    console.log('Final DB Data (after column check):', dbData);

    const [result] = await pool.query(
      `INSERT INTO leave_types SET ?`,
      [dbData]
    );

    console.log('Insert result:', result);
    console.log('Insert ID:', result.insertId);

    const leaveTypeId = result.insertId;

    if (!leaveTypeId) {
      throw new Error('Failed to get insert ID after creating leave type');
    }

    // Handle departments
    if (leaveTypeData.departments && Array.isArray(leaveTypeData.departments)) {
      for (const deptId of leaveTypeData.departments) {
        try {
          await pool.query(
            `INSERT INTO leave_type_departments (leave_type_id, department_id) VALUES (?, ?)`,
            [leaveTypeId, deptId]
          );
        } catch (e) {
          // Ignore duplicate entries
        }
      }
    }

    // Handle designations
    if (leaveTypeData.designations && Array.isArray(leaveTypeData.designations)) {
      for (const desigId of leaveTypeData.designations) {
        try {
          await pool.query(
            `INSERT INTO leave_type_designations (leave_type_id, designation_id) VALUES (?, ?)`,
            [leaveTypeId, desigId]
          );
        } catch (e) {
          // Ignore duplicate entries
        }
      }
    }

    // Fetch the created leave type with relations
    const [newLeaveType] = await pool.query(
      `SELECT * FROM leave_types WHERE id = ?`,
      [leaveTypeId]
    );

    if (!newLeaveType || newLeaveType.length === 0) {
      throw new Error('Failed to fetch created leave type');
    }

    let departments = [];
    let designations = [];

    try {
      // Check if departments table has is_deleted column
      let hasDeptIsDeleted = false;
      try {
        const [deptColumns] = await pool.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'departments' 
           AND COLUMN_NAME = 'is_deleted'`
        );
        hasDeptIsDeleted = deptColumns.length > 0;
      } catch (e) {
        // Ignore
      }

      const [deptResults] = await pool.query(
        `SELECT d.id, d.name 
         FROM departments d
         INNER JOIN leave_type_departments ltd ON d.id = ltd.department_id
         WHERE ltd.leave_type_id = ? ${hasDeptIsDeleted ? 'AND d.is_deleted = 0' : ''}`,
        [leaveTypeId]
      );
      departments = deptResults || [];
    } catch (e) {
      console.warn('Error fetching departments:', e.message);
      departments = [];
    }

    try {
      // Check if positions table has is_deleted column
      let hasPosIsDeleted = false;
      try {
        const [posColumns] = await pool.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'positions' 
           AND COLUMN_NAME = 'is_deleted'`
        );
        hasPosIsDeleted = posColumns.length > 0;
      } catch (e) {
        // Ignore
      }

      const [desigResults] = await pool.query(
        `SELECT p.id, p.name 
         FROM positions p
         INNER JOIN leave_type_designations ltd ON p.id = ltd.designation_id
         WHERE ltd.leave_type_id = ? ${hasPosIsDeleted ? 'AND p.is_deleted = 0' : ''}`,
        [leaveTypeId]
      );
      designations = desigResults || [];
    } catch (e) {
      console.warn('Error fetching designations:', e.message);
      designations = [];
    }

    const createdLeaveType = newLeaveType[0];
    createdLeaveType.departments = departments;
    createdLeaveType.designations = designations;

    console.log('=== LEAVE TYPE CREATED SUCCESSFULLY ===');
    console.log('Created Leave Type:', JSON.stringify(createdLeaveType, null, 2));

    res.status(201).json({
      success: true,
      message: req.t ? req.t('api_msg_f372ee5c') : "Leave type created successfully",
      data: createdLeaveType
    });
  } catch (error) {
    console.error('Error creating leave type:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_5f657c29') : "Failed to create leave type",
      details: error.message
    });
  }
};

/**
 * PUT /api/leave-settings/leave-types/:id
 * Update a leave type
 */
exports.updateLeaveType = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { id } = req.params;
    const { company_id } = req.query;
    const updates = req.body;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    // Check if leave type exists
    const [existing] = await pool.query(
      `SELECT id FROM leave_types WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, company_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_5144118e') : "Leave type not found"
      });
    }

    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.allotment_type !== undefined) dbUpdates.allotment_type = updates.allotment_type;
    if (updates.total_leaves !== undefined) dbUpdates.total_leaves = updates.total_leaves;
    if (updates.monthly_limit !== undefined) dbUpdates.monthly_limit = updates.monthly_limit;
    if (updates.paid_status !== undefined) dbUpdates.paid_status = updates.paid_status;
    if (updates.color_code !== undefined) dbUpdates.color_code = updates.color_code;
    if (updates.allow_carry_forward !== undefined) dbUpdates.allow_carry_forward = updates.allow_carry_forward ? 1 : 0;
    if (updates.max_carry_forward_limit !== undefined) dbUpdates.max_carry_forward_limit = updates.max_carry_forward_limit;
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active ? 1 : 0;

    if (Object.keys(dbUpdates).length > 0) {
      await pool.query(
        `UPDATE leave_types SET ? WHERE id = ? AND company_id = ?`,
        [dbUpdates, id, company_id]
      );
    }

    // Update departments
    if (updates.departments !== undefined) {
      // Delete existing
      await pool.query(
        `DELETE FROM leave_type_departments WHERE leave_type_id = ?`,
        [id]
      );
      // Insert new
      if (Array.isArray(updates.departments)) {
        for (const deptId of updates.departments) {
          try {
            await pool.query(
              `INSERT INTO leave_type_departments (leave_type_id, department_id) VALUES (?, ?)`,
              [id, deptId]
            );
          } catch (e) {
            // Ignore duplicates
          }
        }
      }
    }

    // Update designations
    if (updates.designations !== undefined) {
      // Delete existing
      await pool.query(
        `DELETE FROM leave_type_designations WHERE leave_type_id = ?`,
        [id]
      );
      // Insert new
      if (Array.isArray(updates.designations)) {
        for (const desigId of updates.designations) {
          try {
            await pool.query(
              `INSERT INTO leave_type_designations (leave_type_id, designation_id) VALUES (?, ?)`,
              [id, desigId]
            );
          } catch (e) {
            // Ignore duplicates
          }
        }
      }
    }

    // Fetch updated leave type
    const [updatedLeaveType] = await pool.query(
      `SELECT * FROM leave_types WHERE id = ?`,
      [id]
    );

    const [departments] = await pool.query(
      `SELECT d.id, d.name 
       FROM departments d
       INNER JOIN leave_type_departments ltd ON d.id = ltd.department_id
       WHERE ltd.leave_type_id = ? AND d.is_deleted = 0`,
      [id]
    );

    const [designations] = await pool.query(
      `SELECT p.id, p.name 
       FROM positions p
       INNER JOIN leave_type_designations ltd ON p.id = ltd.designation_id
       WHERE ltd.leave_type_id = ? AND p.is_deleted = 0`,
      [id]
    );

    updatedLeaveType[0].departments = departments;
    updatedLeaveType[0].designations = designations;

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_4ab0e70d') : "Leave type updated successfully",
      data: updatedLeaveType[0]
    });
  } catch (error) {
    console.error('Error updating leave type:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_6008da08') : "Failed to update leave type",
      details: error.message
    });
  }
};

/**
 * DELETE /api/leave-settings/leave-types/:id
 * Delete a leave type (soft delete)
 */
exports.deleteLeaveType = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { id } = req.params;
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    // Check if leave type exists
    const [existing] = await pool.query(
      `SELECT id FROM leave_types WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, company_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_5144118e') : "Leave type not found"
      });
    }

    await pool.query(
      `UPDATE leave_types SET is_deleted = 1 WHERE id = ? AND company_id = ?`,
      [id, company_id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_c78c8776') : "Leave type deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting leave type:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_c92a6e53') : "Failed to delete leave type",
      details: error.message
    });
  }
};

/**
 * POST /api/leave-settings/leave-types/:id/archive
 * Archive a leave type
 */
exports.archiveLeaveType = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { id } = req.params;
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    const [existing] = await pool.query(
      `SELECT id FROM leave_types WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, company_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_5144118e') : "Leave type not found"
      });
    }

    await pool.query(
      `UPDATE leave_types SET is_archived = 1, is_active = 0 WHERE id = ? AND company_id = ?`,
      [id, company_id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_30d4e15d') : "Leave type archived successfully"
    });
  } catch (error) {
    console.error('Error archiving leave type:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_6fd3f2e5') : "Failed to archive leave type",
      details: error.message
    });
  }
};

/**
 * POST /api/leave-settings/leave-types/:id/restore
 * Restore an archived leave type
 */
exports.restoreLeaveType = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { id } = req.params;
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    const [existing] = await pool.query(
      `SELECT id FROM leave_types WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [id, company_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_5144118e') : "Leave type not found"
      });
    }

    await pool.query(
      `UPDATE leave_types SET is_archived = 0, is_active = 1 WHERE id = ? AND company_id = ?`,
      [id, company_id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_8f797275') : "Leave type restored successfully"
    });
  } catch (error) {
    console.error('Error restoring leave type:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_5b4b8a62') : "Failed to restore leave type",
      details: error.message
    });
  }
};

// ================================================
// LEAVE GENERAL SETTINGS
// ================================================

/**
 * GET /api/leave-settings/general-settings
 * Get leave general settings
 */
exports.getGeneralSettings = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    const [settings] = await pool.query(
      `SELECT * FROM leave_general_settings WHERE company_id = ?`,
      [company_id]
    );

    // If no settings exist, return defaults
    if (settings.length === 0) {
      return res.json({
        success: true,
        data: {
          company_id: parseInt(company_id),
          count_leaves_from: 'start_of_year',
          year_starts_from: 'January',
          reporting_manager_can: 'Approve'
        }
      });
    }

    // Map database fields to frontend fields
    const setting = settings[0];
    const responseData = {
      company_id: setting.company_id,
      count_leaves_from: setting.count_leaves_from || 'start_of_year',
      year_starts_from: setting.year_starts_from || 'January',
      reporting_manager_can: setting.reporting_manager_can || 'Approve'
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error fetching leave general settings:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_daa95839') : "Failed to fetch leave general settings",
      details: error.message
    });
  }
};

/**
 * POST /api/leave-settings/general-settings
 * Create or update leave general settings
 */
exports.updateGeneralSettings = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { company_id } = req.query;
    const settingsData = req.body;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    // Map frontend field names to database field names
    const dbData = {
      company_id: company_id,
      count_leaves_from: settingsData.count_leaves_from === 'date_of_joining' ? 'date_of_joining' : 'start_of_year',
      year_starts_from: settingsData.year_starts_from || 'January',
      reporting_manager_can: settingsData.reporting_manager_can || 'Approve'
    };

    // Check if settings exist
    const [existing] = await pool.query(
      `SELECT id FROM leave_general_settings WHERE company_id = ?`,
      [company_id]
    );

    if (existing.length === 0) {
      // Create new
      await pool.query(
        `INSERT INTO leave_general_settings SET ?`,
        [dbData]
      );
    } else {
      // Update existing
      await pool.query(
        `UPDATE leave_general_settings SET ? WHERE company_id = ?`,
        [dbData, company_id]
      );
    }

    const [updatedSettings] = await pool.query(
      `SELECT * FROM leave_general_settings WHERE company_id = ?`,
      [company_id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_581f8a8e') : "Leave general settings updated successfully",
      data: updatedSettings[0]
    });
  } catch (error) {
    console.error('Error updating leave general settings:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_3e976fad') : "Failed to update leave general settings",
      details: error.message
    });
  }
};

module.exports = exports;

