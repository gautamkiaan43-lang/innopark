-- =====================================================
-- Attendance Settings Schema
-- =====================================================

-- Attendance Settings Table
CREATE TABLE IF NOT EXISTS attendance_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  
  -- General Rules
  allow_shift_change_request TINYINT(1) DEFAULT 0,
  save_clock_in_location TINYINT(1) DEFAULT 1,
  allow_self_clock_in TINYINT(1) DEFAULT 1,
  allow_employee_self_clock_in_out TINYINT(1) DEFAULT 1,
  auto_clock_in_on_login TINYINT(1) DEFAULT 0,
  auto_clock_in_first_login TINYINT(1) DEFAULT 0,
  check_location_radius TINYINT(1) DEFAULT 0,
  clock_in_location_radius_check TINYINT(1) DEFAULT 0,
  location_radius_meters INT DEFAULT 100,
  clock_in_location_radius_value INT DEFAULT 0,
  allow_clock_in_outside_shift TINYINT(1) DEFAULT 0,
  check_ip_address TINYINT(1) DEFAULT 0,
  clock_in_ip_check TINYINT(1) DEFAULT 0,
  allowed_ip_addresses TEXT,
  clock_in_ip_addresses TEXT NULL,
  send_monthly_report_email TINYINT(1) DEFAULT 0,
  
  -- Configuration
  week_starts_from ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') DEFAULT 'Monday',
  attendance_reminder_status TINYINT(1) DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_company (company_id),
  INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  shift_name VARCHAR(100) NOT NULL,
  shift_short_code VARCHAR(20),
  shift_type ENUM('Strict', 'Flexible') DEFAULT 'Strict',
  shift_color VARCHAR(20) DEFAULT '#3B82F6',
  
  -- Timings
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  half_day_time TIME,
  auto_clock_out_time TIME,
  
  -- Rules
  early_clock_in_allowed_minutes INT DEFAULT 0,
  late_mark_after_minutes INT DEFAULT 15,
  max_check_ins_per_day INT DEFAULT 1,
  
  -- Working Days (JSON array of day names)
  working_days JSON DEFAULT ('["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'),
  
  -- Default Shift
  is_default TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_company (company_id),
  INDEX idx_default (company_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Shift Rotations Table
CREATE TABLE IF NOT EXISTS shift_rotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  rotation_name VARCHAR(100) NOT NULL,
  rotation_frequency ENUM('Daily', 'Weekly', 'Monthly') DEFAULT 'Weekly',
  
  -- Shifts in sequence (JSON array of shift IDs)
  shift_sequence JSON NOT NULL,
  
  -- Options
  replace_existing_shift TINYINT(1) DEFAULT 1,
  notify_employees TINYINT(1) DEFAULT 1,
  
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Employee Shift Assignments Table
CREATE TABLE IF NOT EXISTS employee_shift_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  employee_id INT NOT NULL,
  shift_id INT NOT NULL,
  rotation_id INT DEFAULT NULL,
  
  -- Assignment Period
  assigned_from DATE NOT NULL,
  assigned_to DATE DEFAULT NULL,
  
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_company (company_id),
  INDEX idx_employee (employee_id),
  INDEX idx_shift (shift_id),
  INDEX idx_active (company_id, employee_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default attendance settings for existing companies
INSERT INTO attendance_settings (company_id, allow_self_clock_in, save_clock_in_location, week_starts_from, attendance_reminder_status)
SELECT id, 1, 1, 'Monday', 1
FROM companies
WHERE id NOT IN (SELECT company_id FROM attendance_settings)
ON DUPLICATE KEY UPDATE company_id = company_id;

