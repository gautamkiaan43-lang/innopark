const pool = require('../config/db');

// --- SHIFTS ---
const getShifts = async (req, res) => {
    try {
        const [shifts] = await pool.execute('SELECT * FROM shifts WHERE is_deleted = 0 ORDER BY created_at DESC');
        res.json({ success: true, data: shifts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const createShift = async (req, res) => {
    try {
        const { shift_name, start_time, end_time, late_mark_duration, clock_in_buffer, option_color } = req.body;
        await pool.execute(
            `INSERT INTO shifts (company_id, shift_name, start_time, end_time, late_mark_duration, clock_in_buffer, option_color) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.companyId || 1, shift_name, start_time, end_time, late_mark_duration || 0, clock_in_buffer || 0, option_color || '#000000']
        );
        res.json({ success: true, message: req.t ? req.t('api_msg_30e4844d') : "Shift created successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const deleteShift = async (req, res) => {
    try {
        await pool.execute('UPDATE shifts SET is_deleted = 1 WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: req.t ? req.t('api_msg_14cb29dd') : "Shift deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- LEAVE TYPES ---
const getLeaveTypes = async (req, res) => {
    try {
        const [types] = await pool.execute('SELECT * FROM leave_types WHERE is_deleted = 0 ORDER BY created_at DESC');
        res.json({ success: true, data: types });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const createLeaveType = async (req, res) => {
    try {
        const { type_name, color, no_of_leaves, is_paid } = req.body;
        await pool.execute(
            `INSERT INTO leave_types (company_id, type_name, color, no_of_leaves, is_paid)
             VALUES (?, ?, ?, ?, ?)`,
            [req.companyId || 1, type_name, color, no_of_leaves || 0, is_paid ? 1 : 0]
        );
        res.json({ success: true, message: req.t ? req.t('api_msg_ad3541da') : "Leave Type created successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const deleteLeaveType = async (req, res) => {
    try {
        await pool.execute('UPDATE leave_types SET is_deleted = 1 WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: req.t ? req.t('api_msg_0d9773c8') : "Leave Type deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- SETTINGS ---
const getAttendanceSettings = async (req, res) => {
    try {
        const [settings] = await pool.execute('SELECT * FROM attendance_settings WHERE company_id = ? LIMIT 1', [req.companyId || 1]);
        res.json({ success: true, data: settings[0] || {} });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const updateAttendanceSettings = async (req, res) => {
    try {
        const { employee_shift_rotation, attendance_regularization, radius_check, radius_meters, ip_restriction, ip_address } = req.body;

        const [existing] = await pool.execute('SELECT id FROM attendance_settings WHERE company_id = ?', [req.companyId || 1]);

        if (existing.length === 0) {
            await pool.execute(
                `INSERT INTO attendance_settings (company_id, employee_shift_rotation, attendance_regularization, radius_check, radius_meters, ip_restriction, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [req.companyId || 1, employee_shift_rotation ? 1 : 0, attendance_regularization ? 1 : 0, radius_check ? 1 : 0, radius_meters || 100, ip_restriction ? 1 : 0, ip_address || '']
            );
        } else {
            await pool.execute(
                `UPDATE attendance_settings SET employee_shift_rotation=?, attendance_regularization=?, radius_check=?, radius_meters=?, ip_restriction=?, ip_address=? WHERE id=?`,
                [employee_shift_rotation ? 1 : 0, attendance_regularization ? 1 : 0, radius_check ? 1 : 0, radius_meters || 100, ip_restriction ? 1 : 0, ip_address || '', existing[0].id]
            );
        }
        res.json({ success: true, message: req.t ? req.t('api_msg_ea7a5754') : "Attendance settings updated" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};


module.exports = {
    getShifts, createShift, deleteShift,
    getLeaveTypes, createLeaveType, deleteLeaveType,
    getAttendanceSettings, updateAttendanceSettings
};
