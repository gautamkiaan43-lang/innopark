-- Add tax and second_tax columns to estimates table if they don't exist
-- Also ensure proposal_date exists for estimate_date

-- Check and add proposal_date column if it doesn't exist
SET @columnExists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'estimates' AND COLUMN_NAME = 'proposal_date');

SET @sql = IF(@columnExists = 0, 
    'ALTER TABLE estimates ADD COLUMN proposal_date DATE NULL AFTER estimate_number',
    'SELECT "proposal_date column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add tax column if it doesn't exist
SET @columnExists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'estimates' AND COLUMN_NAME = 'tax');

SET @sql = IF(@columnExists = 0, 
    'ALTER TABLE estimates ADD COLUMN tax VARCHAR(50) NULL AFTER note',
    'SELECT "tax column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add second_tax column if it doesn't exist
SET @columnExists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'estimates' AND COLUMN_NAME = 'second_tax');

SET @sql = IF(@columnExists = 0, 
    'ALTER TABLE estimates ADD COLUMN second_tax VARCHAR(50) NULL AFTER tax',
    'SELECT "second_tax column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure 'Sent' status exists in status ENUM
ALTER TABLE estimates MODIFY COLUMN status ENUM('Waiting','Accepted','Declined','Expired','Draft','Sent') DEFAULT 'Waiting';

SELECT 'Migration completed successfully!' as result;

