-- Add billing fields to users table (safe version - checks if column exists)
-- Run this in phpMyAdmin or MySQL CLI

-- Only add columns if they don't exist
SET @dbname = DATABASE();

SELECT COUNT(*) INTO @col_exists FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'billing_address';
SET @query = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN billing_address TEXT NULL', 'SELECT "billing_address already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_exists FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'billing_city';
SET @query = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN billing_city VARCHAR(100) NULL', 'SELECT "billing_city already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_exists FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'billing_state';
SET @query = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN billing_state VARCHAR(100) NULL', 'SELECT "billing_state already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_exists FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'billing_country';
SET @query = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN billing_country VARCHAR(100) NULL', 'SELECT "billing_country already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_exists FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'billing_postal_code';
SET @query = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN billing_postal_code VARCHAR(20) NULL', 'SELECT "billing_postal_code already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
