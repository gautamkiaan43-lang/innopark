const pool = require('../config/db');

// ================================================
// ATTENDANCE SETTINGS CONTROLLER
// ================================================

/**
 * Ensure attendance_settings table exists
 */
const ensureTablesExist = async () => {
  try {
    // Check if attendance_settings table exists
    const [tables] = await pool.query(
      "SHOW TABLES LIKE 'attendance_settings'"
    );

    if (tables.length === 0) {
      console.log('Creating attendance_settings table...');
      // Execute schema from migration file
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, '../migrations/attendance_settings_schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = schema.split(';').filter(stmt => stmt.trim());
      for (const stmt of statements) {
        if (stmt.trim()) {
          await pool.query(stmt);
        }
      }
      console.log('Attendance settings tables created successfully');
    } else {
      // Table exists, check and add missing columns
      const [existingColumns] = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'attendance_settings'`
      );
      const columnNames = existingColumns.map(col => col.COLUMN_NAME);

      // List of columns that should exist
      const requiredColumns = [
        { name: 'allow_employee_self_clock_in_out', type: 'TINYINT(1) DEFAULT 1' },
        { name: 'auto_clock_in_first_login', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'clock_in_location_radius_check', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'clock_in_location_radius_value', type: 'INT DEFAULT 0' },
        { name: 'clock_in_ip_check', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'clock_in_ip_addresses', type: 'TEXT NULL' }
      ];

      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          console.log(`Adding ${col.name} column to attendance_settings table...`);
          try {
            await pool.query(
              `ALTER TABLE attendance_settings ADD COLUMN ${col.name} ${col.type}`
            );
            console.log(`${col.name} column added successfully`);
          } catch (e) {
            console.warn(`Error adding ${col.name} column:`, e.message);
          }
        }
      }
    }

    // Check if shifts table exists and add missing columns
    try {
      const [shiftsTable] = await pool.query(
        "SHOW TABLES LIKE 'shifts'"
      );

      if (shiftsTable.length > 0) {
        // Get existing columns
        const [existingColumns] = await pool.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'shifts'`
        );
        const columnNames = existingColumns.map(col => col.COLUMN_NAME);

        // Check and add shift_short_code column
        if (!columnNames.includes('shift_short_code')) {
          console.log('Adding shift_short_code column to shifts table...');
          // Try to add after 'name' column first, if that fails, add at the end
          try {
            await pool.query(
              `ALTER TABLE shifts ADD COLUMN shift_short_code VARCHAR(20) NULL AFTER name`
            );
          } catch (e) {
            // If 'name' column doesn't exist or positioning fails, add at end
            await pool.query(
              `ALTER TABLE shifts ADD COLUMN shift_short_code VARCHAR(20) NULL`
            );
          }
          console.log('shift_short_code column added successfully');
        }

        // Check and add shift_type column
        if (!columnNames.includes('shift_type')) {
          console.log('Adding shift_type column to shifts table...');
          try {
            // Get updated column list (shift_short_code might have been just added)
            const [updatedColumns] = await pool.query(
              `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'shifts'`
            );
            const updatedColumnNames = updatedColumns.map(col => col.COLUMN_NAME);

            // Try to add after shift_short_code if it exists, otherwise after name or at end
            if (updatedColumnNames.includes('shift_short_code')) {
              await pool.query(
                `ALTER TABLE shifts ADD COLUMN shift_type ENUM('Strict', 'Flexible') DEFAULT 'Strict' AFTER shift_short_code`
              );
            } else if (updatedColumnNames.includes('name')) {
              await pool.query(
                `ALTER TABLE shifts ADD COLUMN shift_type ENUM('Strict', 'Flexible') DEFAULT 'Strict' AFTER name`
              );
            } else {
              await pool.query(
                `ALTER TABLE shifts ADD COLUMN shift_type ENUM('Strict', 'Flexible') DEFAULT 'Strict'`
              );
            }
            console.log('shift_type column added successfully');
          } catch (colError) {
            console.warn('Error adding shift_type column:', colError.message);
          }
        }

        // Check and add half_day_time column
        if (!columnNames.includes('half_day_time')) {
          console.log('Adding half_day_time column to shifts table...');
          try {
            await pool.query(
              `ALTER TABLE shifts ADD COLUMN half_day_time TIME NULL`
            );
            console.log('half_day_time column added successfully');
          } catch (e) {
            console.warn('Error adding half_day_time column:', e.message);
          }
        }

        // Check and add auto_clock_out_time column
        if (!columnNames.includes('auto_clock_out_time')) {
          console.log('Adding auto_clock_out_time column to shifts table...');
          try {
            await pool.query(
              `ALTER TABLE shifts ADD COLUMN auto_clock_out_time TIME NULL`
            );
            console.log('auto_clock_out_time column added successfully');
          } catch (e) {
            console.warn('Error adding auto_clock_out_time column:', e.message);
          }
        }

        // Check and add max_check_ins_per_day column
        if (!columnNames.includes('max_check_ins_per_day')) {
          console.log('Adding max_check_ins_per_day column to shifts table...');
          try {
            await pool.query(
              `ALTER TABLE shifts ADD COLUMN max_check_ins_per_day INT DEFAULT 1`
            );
            console.log('max_check_ins_per_day column added successfully');
          } catch (e) {
            console.warn('Error adding max_check_ins_per_day column:', e.message);
          }
        }

        // Check and add working_days column
        if (!columnNames.includes('working_days')) {
          console.log('Adding working_days column to shifts table...');
          try {
            await pool.query(
              `ALTER TABLE shifts ADD COLUMN working_days JSON DEFAULT ('["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]')`
            );
            console.log('working_days column added successfully');
          } catch (e) {
            // If JSON type not supported, use TEXT
            try {
              await pool.query(
                `ALTER TABLE shifts ADD COLUMN working_days TEXT DEFAULT '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'`
              );
              console.log('working_days column added successfully (as TEXT)');
            } catch (e2) {
              console.warn('Error adding working_days column:', e2.message);
            }
          }
        }

        // Check and add is_default column
        if (!columnNames.includes('is_default')) {
          console.log('Adding is_default column to shifts table...');
          try {
            await pool.query(
              `ALTER TABLE shifts ADD COLUMN is_default TINYINT(1) DEFAULT 0`
            );
            console.log('is_default column added successfully');
          } catch (e) {
            console.warn('Error adding is_default column:', e.message);
          }
        }

        // Check and add is_active column
        if (!columnNames.includes('is_active')) {
          console.log('Adding is_active column to shifts table...');
          try {
            await pool.query(
              `ALTER TABLE shifts ADD COLUMN is_active TINYINT(1) DEFAULT 1`
            );
            console.log('is_active column added successfully');
          } catch (e) {
            console.warn('Error adding is_active column:', e.message);
          }
        }
      }
    } catch (tableError) {
      console.warn('Error checking/updating shifts table:', tableError.message);
      // Don't throw - continue execution
    }

    // Check if shift_rotations table exists and add missing columns
    try {
      const [rotationsTable] = await pool.query(
        "SHOW TABLES LIKE 'shift_rotations'"
      );

      if (rotationsTable.length > 0) {
        // Get existing columns
        const [existingColumns] = await pool.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'shift_rotations'`
        );
        const columnNames = existingColumns.map(col => col.COLUMN_NAME);

        // Check and add shift_sequence column (the actual DB column name)
        if (!columnNames.includes('shift_sequence')) {
          // If old column name exists, rename it
          if (columnNames.includes('shifts_in_sequence')) {
            console.log('Renaming shifts_in_sequence to shift_sequence in shift_rotations table...');
            try {
              await pool.query(
                `ALTER TABLE shift_rotations CHANGE COLUMN shifts_in_sequence shift_sequence JSON NOT NULL`
              );
              console.log('Column renamed successfully');
            } catch (e) {
              // If JSON type not supported, use TEXT
              try {
                await pool.query(
                  `ALTER TABLE shift_rotations CHANGE COLUMN shifts_in_sequence shift_sequence TEXT NOT NULL DEFAULT '[]'`
                );
                console.log('Column renamed successfully (as TEXT)');
              } catch (e2) {
                console.warn('Error renaming column:', e2.message);
              }
            }
          } else {
            // Add new column
            console.log('Adding shift_sequence column to shift_rotations table...');
            try {
              await pool.query(
                `ALTER TABLE shift_rotations ADD COLUMN shift_sequence JSON NOT NULL`
              );
              console.log('shift_sequence column added successfully');
            } catch (e) {
              // If JSON type not supported, use TEXT
              try {
                await pool.query(
                  `ALTER TABLE shift_rotations ADD COLUMN shift_sequence TEXT NOT NULL DEFAULT '[]'`
                );
                console.log('shift_sequence column added successfully (as TEXT)');
              } catch (e2) {
                console.warn('Error adding shift_sequence column:', e2.message);
              }
            }
          }
        }

        // Check and add replace_existing_shift column
        if (!columnNames.includes('replace_existing_shift')) {
          console.log('Adding replace_existing_shift column to shift_rotations table...');
          try {
            await pool.query(
              `ALTER TABLE shift_rotations ADD COLUMN replace_existing_shift TINYINT(1) DEFAULT 1`
            );
            console.log('replace_existing_shift column added successfully');
          } catch (e) {
            console.warn('Error adding replace_existing_shift column:', e.message);
          }
        }

        // Check and add notify_employees column
        if (!columnNames.includes('notify_employees')) {
          console.log('Adding notify_employees column to shift_rotations table...');
          try {
            await pool.query(
              `ALTER TABLE shift_rotations ADD COLUMN notify_employees TINYINT(1) DEFAULT 1`
            );
            console.log('notify_employees column added successfully');
          } catch (e) {
            console.warn('Error adding notify_employees column:', e.message);
          }
        }

        // Check and add is_active column
        if (!columnNames.includes('is_active')) {
          console.log('Adding is_active column to shift_rotations table...');
          try {
            await pool.query(
              `ALTER TABLE shift_rotations ADD COLUMN is_active TINYINT(1) DEFAULT 1`
            );
            console.log('is_active column added successfully');
          } catch (e) {
            console.warn('Error adding is_active column:', e.message);
          }
        }
      }
    } catch (tableError) {
      console.warn('Error checking/updating shift_rotations table:', tableError.message);
      // Don't throw - continue execution
    }

    // Check if employee_shift_assignments table exists and add missing columns
    try {
      const [assignmentsTable] = await pool.query(
        "SHOW TABLES LIKE 'employee_shift_assignments'"
      );

      if (assignmentsTable.length > 0) {
        // Get existing columns
        const [existingColumns] = await pool.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'employee_shift_assignments'`
        );
        const columnNames = existingColumns.map(col => col.COLUMN_NAME);

        // Check and add assigned_from column
        if (!columnNames.includes('assigned_from')) {
          console.log('Adding assigned_from column to employee_shift_assignments table...');
          try {
            // If assigned_date exists, rename it; otherwise add new
            if (columnNames.includes('assigned_date')) {
              await pool.query(
                `ALTER TABLE employee_shift_assignments CHANGE COLUMN assigned_date assigned_from DATE NOT NULL`
              );
              console.log('assigned_date renamed to assigned_from successfully');
            } else {
              await pool.query(
                `ALTER TABLE employee_shift_assignments ADD COLUMN assigned_from DATE NOT NULL`
              );
              console.log('assigned_from column added successfully');
            }
          } catch (e) {
            console.warn('Error adding/renaming assigned_from column:', e.message);
          }
        }

        // Check and add assigned_to column
        if (!columnNames.includes('assigned_to')) {
          console.log('Adding assigned_to column to employee_shift_assignments table...');
          try {
            await pool.query(
              `ALTER TABLE employee_shift_assignments ADD COLUMN assigned_to DATE NULL`
            );
            console.log('assigned_to column added successfully');
          } catch (e) {
            console.warn('Error adding assigned_to column:', e.message);
          }
        }

        // Check and add rotation_id column
        if (!columnNames.includes('rotation_id')) {
          console.log('Adding rotation_id column to employee_shift_assignments table...');
          try {
            await pool.query(
              `ALTER TABLE employee_shift_assignments ADD COLUMN rotation_id INT NULL`
            );
            console.log('rotation_id column added successfully');
          } catch (e) {
            console.warn('Error adding rotation_id column:', e.message);
          }
        }

        // Check and add is_active column
        if (!columnNames.includes('is_active')) {
          console.log('Adding is_active column to employee_shift_assignments table...');
          try {
            await pool.query(
              `ALTER TABLE employee_shift_assignments ADD COLUMN is_active TINYINT(1) DEFAULT 1`
            );
            console.log('is_active column added successfully');
          } catch (e) {
            console.warn('Error adding is_active column:', e.message);
          }
        }
      }
    } catch (tableError) {
      console.warn('Error checking/updating employee_shift_assignments table:', tableError.message);
      // Don't throw - continue execution
    }
  } catch (error) {
    console.error('Error ensuring tables exist:', error);
    throw error;
  }
};

/**
 * GET /api/admin/attendance-settings
 * Fetch attendance settings for a company
 */
exports.getAttendanceSettings = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { company_id } = req.query;
    
    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    // Fetch settings
    const [settings] = await pool.query(
      `SELECT * FROM attendance_settings WHERE company_id = ?`,
      [company_id]
    );

    // If no settings exist, create default
    if (settings.length === 0) {
      const defaultSettings = {
        company_id,
        allow_shift_change_request: 0,
        save_clock_in_location: 0,
        allow_employee_self_clock_in_out: 1,
        auto_clock_in_first_login: 0,
        clock_in_location_radius_check: 0,
        clock_in_location_radius_value: 0,
        allow_clock_in_outside_shift: 0,
        clock_in_ip_check: 0,
        clock_in_ip_addresses: JSON.stringify([]),
        send_monthly_report_email: 0,
        week_starts_from: 'Monday',
        attendance_reminder_status: 0
      };

      await pool.query(
        `INSERT INTO attendance_settings SET ?`,
        [defaultSettings]
      );

      const [newSettings] = await pool.query(
        `SELECT * FROM attendance_settings WHERE company_id = ?`,
        [company_id]
      );

      return res.json({
        success: true,
        data: {
          ...newSettings[0],
          clock_in_ip_addresses: JSON.parse(newSettings[0].clock_in_ip_addresses || '[]')
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...settings[0],
        clock_in_ip_addresses: JSON.parse(settings[0].clock_in_ip_addresses || '[]')
      }
    });
  } catch (error) {
    console.error('Error fetching attendance settings:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_70ba5d42') : "Failed to fetch attendance settings",
      details: error.message
    });
  }
};

/**
 * PUT /api/admin/attendance-settings
 * Update attendance settings for a company
 */
exports.updateAttendanceSettings = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { company_id } = req.query;
    const updates = req.body;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    // Convert IP addresses array to JSON string
    if (updates.clock_in_ip_addresses && Array.isArray(updates.clock_in_ip_addresses)) {
      updates.clock_in_ip_addresses = JSON.stringify(updates.clock_in_ip_addresses);
    }

    // Check if settings exist
    const [existing] = await pool.query(
      `SELECT id FROM attendance_settings WHERE company_id = ?`,
      [company_id]
    );

    if (existing.length === 0) {
      // Insert new settings
      updates.company_id = company_id;
      await pool.query(
        `INSERT INTO attendance_settings SET ?`,
        [updates]
      );
    } else {
      // Update existing settings
      await pool.query(
        `UPDATE attendance_settings SET ? WHERE company_id = ?`,
        [updates, company_id]
      );
    }

    // Fetch updated settings
    const [updatedSettings] = await pool.query(
      `SELECT * FROM attendance_settings WHERE company_id = ?`,
      [company_id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_f0490b74') : "Attendance settings updated successfully",
      data: {
        ...updatedSettings[0],
        clock_in_ip_addresses: JSON.parse(updatedSettings[0].clock_in_ip_addresses || '[]')
      }
    });
  } catch (error) {
    console.error('Error updating attendance settings:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_0f89b481') : "Failed to update attendance settings",
      details: error.message
    });
  }
};

/**
 * GET /api/admin/shifts
 * Fetch all shifts for a company
 */
exports.getAllShifts = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    const [shifts] = await pool.query(
      `SELECT * FROM shifts WHERE company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY name ASC`,
      [company_id]
    );

    // Map database columns to expected field names (actual DB uses: name, color, late_mark_after, early_clock_in)
    const parsedShifts = shifts.map(shift => ({
      id: shift.id,
      company_id: shift.company_id,
      shift_name: shift.name || shift.shift_name, // Map 'name' to 'shift_name' for frontend
      shift_short_code: shift.shift_short_code || '',
      shift_type: shift.shift_type || 'Strict',
      shift_color: shift.color || shift.shift_color || '#3B82F6', // Map 'color' to 'shift_color' for frontend
      start_time: shift.start_time,
      end_time: shift.end_time,
      half_day_mark_time: shift.half_day_time || null,
      half_day_time: shift.half_day_time || null,
      auto_clock_out_time: shift.auto_clock_out_time || null,
      early_clock_in_allowed_minutes: shift.early_clock_in || shift.early_clock_in_allowed_minutes || 0, // Map 'early_clock_in' to 'early_clock_in_allowed_minutes'
      late_mark_after_minutes: shift.late_mark_after || shift.late_mark_after_minutes || 15, // Map 'late_mark_after' to 'late_mark_after_minutes'
      max_check_ins_per_day: shift.max_check_ins_per_day || 1,
      working_days: shift.working_days ? (typeof shift.working_days === 'string' ? JSON.parse(shift.working_days) : shift.working_days) : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      is_default: shift.is_default || 0,
      is_active: shift.is_active !== undefined ? shift.is_active : 1,
      created_at: shift.created_at,
      updated_at: shift.updated_at
    }));

    res.json({
      success: true,
      data: parsedShifts
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_f854b6df') : "Failed to fetch shifts",
      details: error.message
    });
  }
};

/**
 * GET /api/admin/shifts/:id
 * Fetch a single shift by ID
 */
exports.getShiftById = async (req, res) => {
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

    const [shifts] = await pool.query(
      `SELECT * FROM shifts WHERE id = ? AND company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)`,
      [id, company_id]
    );

    if (shifts.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_4bc674be') : "Shift not found"
      });
    }

    const shift = shifts[0];
    res.json({
      success: true,
      data: {
        id: shift.id,
        company_id: shift.company_id,
        shift_name: shift.name || shift.shift_name,
        shift_short_code: shift.shift_short_code || '',
        shift_type: shift.shift_type || 'Strict',
        shift_color: shift.color || shift.shift_color || '#3B82F6',
        start_time: shift.start_time,
        end_time: shift.end_time,
        half_day_mark_time: shift.half_day_time || null,
        half_day_time: shift.half_day_time || null,
        auto_clock_out_time: shift.auto_clock_out_time || null,
        early_clock_in_allowed_minutes: shift.early_clock_in || shift.early_clock_in_allowed_minutes || 0,
        late_mark_after_minutes: shift.late_mark_after || shift.late_mark_after_minutes || 15,
        max_check_ins_per_day: shift.max_check_ins_per_day || 1,
        working_days: shift.working_days ? (typeof shift.working_days === 'string' ? JSON.parse(shift.working_days) : shift.working_days) : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        is_default: shift.is_default || 0,
        is_active: shift.is_active !== undefined ? shift.is_active : 1,
        created_at: shift.created_at,
        updated_at: shift.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching shift:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_76b0b031') : "Failed to fetch shift",
      details: error.message
    });
  }
};

/**
 * POST /api/admin/shifts
 * Create a new shift
 */
exports.createShift = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { company_id } = req.query;
    const shiftData = req.body;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    // Validate required fields
    if (!shiftData.shift_name || !shiftData.start_time || !shiftData.end_time) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_a6ee1722') : "Shift name, start time, and end time are required"
      });
    }

    // Check if shift_type column exists
    const [shiftTypeColumn] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'shifts' 
       AND COLUMN_NAME = 'shift_type'`
    );

    // Check if shift_short_code column exists
    const [shiftShortCodeColumn] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'shifts' 
       AND COLUMN_NAME = 'shift_short_code'`
    );

    // Map frontend field names to database column names (actual DB uses: name, color, late_mark_after, early_clock_in)
    const dbData = {
      company_id: company_id,
      name: shiftData.shift_name, // Database uses 'name' not 'shift_name'
      color: shiftData.shift_color || '#3B82F6', // Database uses 'color' not 'shift_color'
      start_time: shiftData.start_time,
      end_time: shiftData.end_time,
      half_day_time: shiftData.half_day_time || shiftData.half_day_mark_time || null,
      auto_clock_out_time: shiftData.auto_clock_out_time || null,
      early_clock_in: shiftData.early_clock_in_allowed_minutes || 0, // Database uses 'early_clock_in' not 'early_clock_in_allowed_minutes'
      late_mark_after: shiftData.late_mark_after_minutes || 15, // Database uses 'late_mark_after' not 'late_mark_after_minutes'
      max_check_ins_per_day: shiftData.max_check_ins_per_day || 1,
      working_days: shiftData.working_days ? JSON.stringify(Array.isArray(shiftData.working_days) ? shiftData.working_days : [shiftData.working_days]) : JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
      is_default: shiftData.is_default ? 1 : 0,
      is_active: shiftData.is_active !== undefined ? (shiftData.is_active ? 1 : 0) : 1
    };

    // Only include shift_short_code if column exists
    if (shiftShortCodeColumn.length > 0) {
      dbData.shift_short_code = shiftData.shift_short_code || null;
    }

    // Only include shift_type if column exists
    if (shiftTypeColumn.length > 0) {
      dbData.shift_type = shiftData.shift_type || 'Strict';
    }

    const [result] = await pool.query(
      `INSERT INTO shifts SET ?`,
      [dbData]
    );

    // Fetch the created shift
    const [newShift] = await pool.query(
      `SELECT * FROM shifts WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: req.t ? req.t('api_msg_30e4844d') : "Shift created successfully",
      data: {
        ...newShift[0],
        working_days: JSON.parse(newShift[0].working_days || '[]')
      }
    });
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_1c2afb5a') : "Failed to create shift",
      details: error.message
    });
  }
};

/**
 * PUT /api/admin/shifts/:id
 * Update a shift
 */
exports.updateShift = async (req, res) => {
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

    // Check if shift exists
    const [existing] = await pool.query(
      `SELECT id FROM shifts WHERE id = ? AND company_id = ?`,
      [id, company_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_4bc674be') : "Shift not found"
      });
    }

    // Check which columns exist in the table
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'shifts'`
    );
    const columnNames = columns.map(col => col.COLUMN_NAME);

    // Map frontend field names to database column names (actual DB uses: name, color, late_mark_after, early_clock_in)
    const dbUpdates = {};
    if (updates.shift_name !== undefined) dbUpdates.name = updates.shift_name; // Map to 'name'
    if (updates.shift_short_code !== undefined && columnNames.includes('shift_short_code')) {
      dbUpdates.shift_short_code = updates.shift_short_code;
    }
    if (updates.shift_type !== undefined && columnNames.includes('shift_type')) {
      dbUpdates.shift_type = updates.shift_type;
    }
    if (updates.shift_color !== undefined) dbUpdates.color = updates.shift_color; // Map to 'color'
    if (updates.start_time !== undefined) dbUpdates.start_time = updates.start_time;
    if (updates.end_time !== undefined) dbUpdates.end_time = updates.end_time;
    if (updates.half_day_time !== undefined || updates.half_day_mark_time !== undefined) dbUpdates.half_day_time = updates.half_day_time || updates.half_day_mark_time;
    if (updates.auto_clock_out_time !== undefined) dbUpdates.auto_clock_out_time = updates.auto_clock_out_time;
    if (updates.late_mark_after_minutes !== undefined) dbUpdates.late_mark_after = updates.late_mark_after_minutes; // Map to 'late_mark_after'
    if (updates.early_clock_in_allowed_minutes !== undefined) dbUpdates.early_clock_in = updates.early_clock_in_allowed_minutes; // Map to 'early_clock_in'
    if (updates.max_check_ins_per_day !== undefined) dbUpdates.max_check_ins_per_day = updates.max_check_ins_per_day;
    if (updates.working_days !== undefined) dbUpdates.working_days = JSON.stringify(Array.isArray(updates.working_days) ? updates.working_days : [updates.working_days]);
    if (updates.is_default !== undefined) dbUpdates.is_default = updates.is_default ? 1 : 0;
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active ? 1 : 0;

    if (Object.keys(dbUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_e9f00744') : "No valid fields to update"
      });
    }

    await pool.query(
      `UPDATE shifts SET ? WHERE id = ? AND company_id = ?`,
      [dbUpdates, id, company_id]
    );

    // Fetch updated shift
    const [updatedShift] = await pool.query(
      `SELECT * FROM shifts WHERE id = ?`,
      [id]
    );

    const shift = updatedShift[0];
    res.json({
      success: true,
      message: req.t ? req.t('api_msg_6e1b2d34') : "Shift updated successfully",
      data: {
        id: shift.id,
        company_id: shift.company_id,
        shift_name: shift.name || shift.shift_name,
        shift_short_code: shift.shift_short_code || '',
        shift_type: shift.shift_type || 'Strict',
        shift_color: shift.color || shift.shift_color || '#3B82F6',
        start_time: shift.start_time,
        end_time: shift.end_time,
        half_day_mark_time: shift.half_day_time || null,
        half_day_time: shift.half_day_time || null,
        auto_clock_out_time: shift.auto_clock_out_time || null,
        early_clock_in_allowed_minutes: shift.early_clock_in || shift.early_clock_in_allowed_minutes || 0,
        late_mark_after_minutes: shift.late_mark_after || shift.late_mark_after_minutes || 15,
        max_check_ins_per_day: shift.max_check_ins_per_day || 1,
        working_days: shift.working_days ? (typeof shift.working_days === 'string' ? JSON.parse(shift.working_days) : shift.working_days) : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        is_default: shift.is_default || 0,
        is_active: shift.is_active !== undefined ? shift.is_active : 1,
        description: shift.description || '',
        created_at: shift.created_at,
        updated_at: shift.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_e0b8fd6e') : "Failed to update shift",
      details: error.message
    });
  }
};

/**
 * DELETE /api/admin/shifts/:id
 * Delete a shift
 */
exports.deleteShift = async (req, res) => {
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

    // Check if shift exists
    const [existing] = await pool.query(
      `SELECT is_default FROM shifts WHERE id = ? AND company_id = ?`,
      [id, company_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_4bc674be') : "Shift not found"
      });
    }

    // Don't allow deleting default shift
    if (existing[0].is_default) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c6aaf79e') : "Cannot delete the default shift"
      });
    }

    // Check if any employees are assigned to this shift
    const [assignments] = await pool.query(
      `SELECT COUNT(*) as count FROM employee_shift_assignments WHERE shift_id = ?`,
      [id]
    );

    if (assignments[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_88a9e7ef') : "Cannot delete shift that has employee assignments"
      });
    }

    await pool.query(
      `DELETE FROM shifts WHERE id = ? AND company_id = ?`,
      [id, company_id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_14cb29dd') : "Shift deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_5bb3eda7') : "Failed to delete shift",
      details: error.message
    });
  }
};

/**
 * POST /api/admin/shifts/:id/set-default
 * Set a shift as default
 */
exports.setDefaultShift = async (req, res) => {
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

    // Check if shift exists
    const [existing] = await pool.query(
      `SELECT id FROM shifts WHERE id = ? AND company_id = ?`,
      [id, company_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_4bc674be') : "Shift not found"
      });
    }

    // Unset all defaults
    await pool.query(
      `UPDATE shifts SET is_default = 0 WHERE company_id = ?`,
      [company_id]
    );

    // Set this shift as default
    await pool.query(
      `UPDATE shifts SET is_default = 1 WHERE id = ? AND company_id = ?`,
      [id, company_id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_92930211') : "Default shift updated successfully"
    });
  } catch (error) {
    console.error('Error setting default shift:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_a206a92a') : "Failed to set default shift",
      details: error.message
    });
  }
};

/**
 * GET /api/admin/shift-rotations
 * Fetch all shift rotations for a company
 */
exports.getAllRotations = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    const [rotations] = await pool.query(
      `SELECT * FROM shift_rotations WHERE company_id = ? ORDER BY created_at DESC`,
      [company_id]
    );

    // Parse JSON fields - map shift_sequence (DB) to shifts_in_sequence (API)
    const parsedRotations = rotations.map(rotation => ({
      ...rotation,
      shifts_in_sequence: JSON.parse(rotation.shift_sequence || rotation.shifts_in_sequence || '[]')
    }));

    res.json({
      success: true,
      data: parsedRotations
    });
  } catch (error) {
    console.error('Error fetching rotations:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_aef91c3a') : "Failed to fetch rotations",
      details: error.message
    });
  }
};

/**
 * POST /api/admin/shift-rotations
 * Create a new shift rotation
 */
exports.createRotation = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { company_id } = req.query;
    const rotationData = req.body;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    // Validate required fields
    if (!rotationData.rotation_name || !rotationData.rotation_frequency) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_31a5b642') : "Rotation name and frequency are required"
      });
    }

    // Map frontend field names to database column names
    // Frontend uses 'shifts_in_sequence', DB uses 'shift_sequence'
    const dbData = {
      company_id: company_id,
      rotation_name: rotationData.rotation_name,
      rotation_frequency: rotationData.rotation_frequency,
      shift_sequence: rotationData.shifts_in_sequence && Array.isArray(rotationData.shifts_in_sequence) 
        ? JSON.stringify(rotationData.shifts_in_sequence) 
        : JSON.stringify([]),
      replace_existing_shift: rotationData.replace_existing_shift !== undefined ? (rotationData.replace_existing_shift ? 1 : 0) : 1,
      notify_employees: rotationData.notify_employees !== undefined ? (rotationData.notify_employees ? 1 : 0) : 1,
      is_active: rotationData.is_active !== undefined ? (rotationData.is_active ? 1 : 0) : 1
    };

    const [result] = await pool.query(
      `INSERT INTO shift_rotations SET ?`,
      [dbData]
    );

    // Fetch the created rotation
    const [newRotation] = await pool.query(
      `SELECT * FROM shift_rotations WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: req.t ? req.t('api_msg_86caad9e') : "Shift rotation created successfully",
      data: {
        ...newRotation[0],
        shifts_in_sequence: JSON.parse(newRotation[0].shift_sequence || newRotation[0].shifts_in_sequence || '[]')
      }
    });
  } catch (error) {
    console.error('Error creating rotation:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_340a148e') : "Failed to create rotation",
      details: error.message
    });
  }
};

/**
 * DELETE /api/admin/shift-rotations/:id
 * Delete a shift rotation
 */
exports.deleteRotation = async (req, res) => {
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

    // Check if rotation exists
    const [existing] = await pool.query(
      `SELECT id FROM shift_rotations WHERE id = ? AND company_id = ?`,
      [id, company_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_e23592bb') : "Rotation not found"
      });
    }

    await pool.query(
      `DELETE FROM shift_rotations WHERE id = ? AND company_id = ?`,
      [id, company_id]
    );

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_dcc33929') : "Rotation deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting rotation:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_b4cc600f') : "Failed to delete rotation",
      details: error.message
    });
  }
};

/**
 * POST /api/admin/shift-rotations/run
 * Run shift rotation for selected employees
 */
exports.runRotation = async (req, res) => {
  try {
    await ensureTablesExist();
    
    const { company_id } = req.query;
    const { rotation_id, employee_ids, start_date } = req.body;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_c9d0dab7') : "Company ID is required"
      });
    }

    if (!rotation_id || !employee_ids || !Array.isArray(employee_ids)) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_994d7de3') : "Rotation ID and employee IDs are required"
      });
    }

    // Fetch rotation details
    const [rotations] = await pool.query(
      `SELECT * FROM shift_rotations WHERE id = ? AND company_id = ?`,
      [rotation_id, company_id]
    );

    if (rotations.length === 0) {
      return res.status(404).json({
        success: false,
        error: req.t ? req.t('api_msg_e23592bb') : "Rotation not found"
      });
    }

    const rotation = rotations[0];
    // Map shift_sequence (DB) to shifts_in_sequence (API)
    const shiftsInSequence = JSON.parse(rotation.shift_sequence || rotation.shifts_in_sequence || '[]');

    if (shiftsInSequence.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_47bbcc3d') : "Rotation has no shifts defined"
      });
    }

    const assignmentDate = start_date || new Date().toISOString().split('T')[0];

    // Assign shifts to employees
    const assignments = [];
    for (let i = 0; i < employee_ids.length; i++) {
      const shiftId = shiftsInSequence[i % shiftsInSequence.length];
      
      // Check if assignment already exists - use assigned_from (correct column name)
      // Check for assignments that overlap with the assignment date
      const [existing] = await pool.query(
        `SELECT id FROM employee_shift_assignments 
         WHERE employee_id = ? 
         AND assigned_from <= ? 
         AND (assigned_to IS NULL OR assigned_to >= ?)
         AND is_active = 1`,
        [employee_ids[i], assignmentDate, assignmentDate]
      );

      if (existing.length > 0 && rotation.replace_existing_shift) {
        // Update existing assignment
        await pool.query(
          `UPDATE employee_shift_assignments 
           SET shift_id = ?, rotation_id = ? 
           WHERE employee_id = ? 
           AND assigned_from <= ? 
           AND (assigned_to IS NULL OR assigned_to >= ?)
           AND is_active = 1`,
          [shiftId, rotation_id, employee_ids[i], assignmentDate, assignmentDate]
        );
      } else if (existing.length === 0) {
        // Create new assignment
        await pool.query(
          `INSERT INTO employee_shift_assignments 
           (company_id, employee_id, shift_id, rotation_id, assigned_from) 
           VALUES (?, ?, ?, ?, ?)`,
          [company_id, employee_ids[i], shiftId, rotation_id, assignmentDate]
        );
      }

      assignments.push({
        employee_id: employee_ids[i],
        shift_id: shiftId,
        assigned_from: assignmentDate
      });
    }

    res.json({
      success: true,
      message: `Shift rotation applied to ${employee_ids.length} employees`,
      data: {
        assignments_created: assignments.length
      }
    });
  } catch (error) {
    console.error('Error running rotation:', error);
    res.status(500).json({
      success: false,
      error: req.t ? req.t('api_msg_681cc651') : "Failed to run rotation",
      details: error.message
    });
  }
};

module.exports = exports;

