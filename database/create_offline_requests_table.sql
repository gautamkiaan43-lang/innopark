-- Create offline_requests table for Super Admin
CREATE TABLE IF NOT EXISTS offline_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NULL,
  company_name VARCHAR(255) NOT NULL,
  request_type VARCHAR(50) NOT NULL DEFAULT 'Payment',
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NULL,
  contact_phone VARCHAR(50) NULL,
  amount DECIMAL(15,2) NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  payment_method VARCHAR(100) NULL,
  description TEXT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  INDEX idx_company_id (company_id),
  INDEX idx_status (status),
  INDEX idx_request_type (request_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create settings table for system-wide settings
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

