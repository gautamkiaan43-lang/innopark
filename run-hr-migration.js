const pool = require('./config/db');

async function migrate() {
    console.log('Starting HR Migration...');
    try {
        // 1. Shifts Table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS shifts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company_id INT NOT NULL DEFAULT 1,
                shift_name VARCHAR(100) NOT NULL,
                shift_short_code VARCHAR(10),
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                half_day_time TIME,
                late_mark_duration INT DEFAULT 0,
                clock_in_buffer INT DEFAULT 0,
                option_color VARCHAR(20) DEFAULT '#000000',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_deleted TINYINT(1) DEFAULT 0
            )
        `);

        // 2. Leave Types Table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS leave_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company_id INT NOT NULL DEFAULT 1,
                type_name VARCHAR(100) NOT NULL,
                color VARCHAR(20) DEFAULT '#000000',
                no_of_leaves INT DEFAULT 12,
                period VARCHAR(20) DEFAULT 'monthly', 
                is_paid TINYINT(1) DEFAULT 1,
                allow_carry_forward TINYINT(1) DEFAULT 0,
                max_carry_forward INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_deleted TINYINT(1) DEFAULT 0
            )
        `);

        // 3. Alter Employees Table
        try {
            await pool.execute(`ALTER TABLE employees ADD COLUMN shift_id INT NULL`);
        } catch (e) { console.log('shift_id might exist'); }

        try {
            await pool.execute(`ALTER TABLE employees ADD COLUMN contract_end_date DATE NULL`);
        } catch (e) { console.log('contract_end_date might exist'); }

        // 4. Attendance Settings Table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS attendance_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company_id INT NOT NULL DEFAULT 1,
                employee_shift_rotation TINYINT(1) DEFAULT 0,
                attendance_regularization TINYINT(1) DEFAULT 1,
                radius_check TINYINT(1) DEFAULT 0,
                radius_meters INT DEFAULT 100,
                ip_restriction TINYINT(1) DEFAULT 0,
                ip_address TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Seed Defaults
        // General Shift
        const [shifts] = await pool.execute('SELECT id FROM shifts WHERE shift_name = ?', ['General Shift']);
        if (shifts.length === 0) {
            await pool.execute(`
                INSERT INTO shifts (shift_name, shift_short_code, start_time, end_time, late_mark_duration, option_color)
                VALUES ('General Shift', 'GS', '09:00:00', '18:00:00', 15, '#99C7F4')
            `);
        }

        // Leave Types
        const [ltypes] = await pool.execute('SELECT id FROM leave_types WHERE type_name = ?', ['Casual Leave']);
        if (ltypes.length === 0) {
            await pool.execute(`
                INSERT INTO leave_types (type_name, color, no_of_leaves, is_paid)
                VALUES ('Casual Leave', '#16bf48', 12, 1)
            `);
            await pool.execute(`
                INSERT INTO leave_types (type_name, color, no_of_leaves, is_paid)
                VALUES ('Sick Leave', '#db1313', 10, 1)
            `);
        }

        // Settings
        const [asettings] = await pool.execute('SELECT id FROM attendance_settings WHERE company_id = 1');
        if (asettings.length === 0) {
            await pool.execute('INSERT INTO attendance_settings (company_id) VALUES (1)');
        }

        console.log('HR Migration Completed.');
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();
