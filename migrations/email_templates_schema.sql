-- =====================================================
-- Email Templates Schema
-- Run this migration to ensure table structure
-- =====================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body LONGTEXT NOT NULL,
    type VARCHAR(100) DEFAULT NULL COMMENT 'Template type key (e.g., contract_sent, invoice_payment_confirmation)',
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_id (company_id),
    INDEX idx_type (type),
    INDEX idx_is_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add type column if it doesn't exist (for existing tables)
-- This is safe to run multiple times
SET @dbname = DATABASE();
SET @tablename = 'email_templates';
SET @columnname = 'type';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(100) DEFAULT NULL COMMENT "Template type key"')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- =====================================================
-- Default Email Templates (Optional - Seed Data)
-- =====================================================

-- You can insert default templates here if needed
-- Example:
-- INSERT INTO email_templates (company_id, name, type, subject, body)
-- SELECT 1, 'Invoice Sent', 'send_invoice', 'Invoice #{{invoice_number}} from {{company_name}}', '<html>...</html>'
-- WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE company_id = 1 AND type = 'send_invoice');

