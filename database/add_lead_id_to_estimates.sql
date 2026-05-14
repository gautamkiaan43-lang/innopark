-- Add lead_id column to estimates table and make some columns nullable
-- Run this migration to support creating estimates from lead detail page

-- Add lead_id column if it doesn't exist
SET @columnExists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'estimates' AND COLUMN_NAME = 'lead_id');

SET @sql = IF(@columnExists = 0, 
    'ALTER TABLE estimates ADD COLUMN lead_id INT UNSIGNED NULL AFTER project_id',
    'SELECT "lead_id column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make valid_till nullable
ALTER TABLE estimates MODIFY COLUMN valid_till DATE NULL;

-- Make client_id nullable
ALTER TABLE estimates MODIFY COLUMN client_id INT UNSIGNED NULL;

-- Add foreign key for lead_id if not exists
SET @fkExists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'estimates' AND CONSTRAINT_NAME = 'fk_estimate_lead');

SET @sql = IF(@fkExists = 0, 
    'ALTER TABLE estimates ADD CONSTRAINT fk_estimate_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL',
    'SELECT "Foreign key already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for lead_id
SET @indexExists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'estimates' AND INDEX_NAME = 'idx_estimate_lead');

SET @sql = IF(@indexExists = 0, 
    'CREATE INDEX idx_estimate_lead ON estimates(lead_id)',
    'SELECT "Index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration completed successfully!' as result;

