-- Add recurring invoice fields to invoices table if they don't exist
-- This migration adds repeat_every and repeat_type columns for better recurring invoice management

-- Check and add repeat_every column if it doesn't exist
SET @columnExists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'repeat_every');

SET @sql = IF(@columnExists = 0, 
    'ALTER TABLE invoices ADD COLUMN repeat_every INT NULL AFTER recurring_total_count',
    'SELECT "repeat_every column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add repeat_type column if it doesn't exist
SET @columnExists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'repeat_type');

SET @sql = IF(@columnExists = 0, 
    'ALTER TABLE invoices ADD COLUMN repeat_type VARCHAR(20) NULL AFTER repeat_every',
    'SELECT "repeat_type column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add bill_date column if it doesn't exist (for consistency with estimates)
SET @columnExists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'bill_date');

SET @sql = IF(@columnExists = 0, 
    'ALTER TABLE invoices ADD COLUMN bill_date DATE NULL AFTER invoice_date',
    'SELECT "bill_date column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update billing_frequency ENUM to include more options if needed
-- Check current ENUM values first
SET @enumValues = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'billing_frequency');

-- If billing_frequency doesn't include 'Daily' or 'Weekly', update it
-- Note: This is a simple check - in production, you might want more robust ENUM modification
SET @sql = IF(@enumValues NOT LIKE '%Daily%' OR @enumValues NOT LIKE '%Weekly%',
    'ALTER TABLE invoices MODIFY COLUMN billing_frequency ENUM(\'Daily\',\'Weekly\',\'Monthly\',\'Quarterly\',\'Yearly\') NULL',
    'SELECT "billing_frequency ENUM already has all required values"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration completed successfully!' as result;

