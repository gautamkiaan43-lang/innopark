-- =====================================================
-- Leave Settings Schema
-- =====================================================

-- Enhanced Leave Types Table
CREATE TABLE IF NOT EXISTS leave_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  allotment_type ENUM('Monthly', 'Yearly') DEFAULT 'Yearly',
  total_leaves INT DEFAULT 0,
  monthly_limit INT DEFAULT 0,
  paid_status ENUM('Paid', 'Unpaid') DEFAULT 'Paid',
  color_code VARCHAR(20) DEFAULT '#3B82F6',
  allow_carry_forward TINYINT(1) DEFAULT 0,
  max_carry_forward_limit INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  is_archived TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  
  INDEX idx_company (company_id),
  INDEX idx_active (is_active, is_archived),
  INDEX idx_archived (is_archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Leave Type Departments (Pivot Table)
CREATE TABLE IF NOT EXISTS leave_type_departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leave_type_id INT NOT NULL,
  department_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_leave_dept (leave_type_id, department_id),
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  INDEX idx_leave_type (leave_type_id),
  INDEX idx_department (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Leave Type Designations (Pivot Table)
CREATE TABLE IF NOT EXISTS leave_type_designations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leave_type_id INT NOT NULL,
  designation_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_leave_designation (leave_type_id, designation_id),
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
  FOREIGN KEY (designation_id) REFERENCES positions(id) ON DELETE CASCADE,
  INDEX idx_leave_type (leave_type_id),
  INDEX idx_designation (designation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Leave General Settings Table
CREATE TABLE IF NOT EXISTS leave_general_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL UNIQUE,
  count_leaves_from ENUM('date_of_joining', 'start_of_year') DEFAULT 'start_of_year',
  year_starts_from ENUM('January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December') DEFAULT 'January',
  reporting_manager_can ENUM('Approve', 'Pre-Approve') DEFAULT 'Approve',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

