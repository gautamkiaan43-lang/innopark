-- Migration for Currency and Timezone updates
-- 1. Update Companies table defaults and existing records
ALTER TABLE `companies` ALTER COLUMN `currency` SET DEFAULT 'EUR';
ALTER TABLE `companies` ALTER COLUMN `timezone` SET DEFAULT 'Europe/Berlin';

UPDATE `companies` SET `currency` = 'EUR', `timezone` = 'Europe/Berlin' WHERE `currency` = 'USD' OR `timezone` = 'UTC';

-- 2. Update Clients table defaults and existing records
ALTER TABLE `clients` ALTER COLUMN `currency` SET DEFAULT 'EUR';
ALTER TABLE `clients` ALTER COLUMN `currency_symbol` SET DEFAULT '€';
ALTER TABLE `clients` ALTER COLUMN `country` SET DEFAULT 'Germany';
ALTER TABLE `clients` ALTER COLUMN `phone_country_code` SET DEFAULT '+49';

UPDATE `clients` SET `currency` = 'EUR', `currency_symbol` = '€' WHERE `currency` = 'USD';

-- 3. Update Users table to add per-user timezone
ALTER TABLE `users` ADD COLUMN `timezone` VARCHAR(50) DEFAULT 'Europe/Berlin' AFTER `address`;

-- 4. Update Finance tables defaults
ALTER TABLE `invoices` ALTER COLUMN `currency` SET DEFAULT 'EUR';
UPDATE `invoices` SET `currency` = 'EUR' WHERE `currency` = 'USD';

ALTER TABLE `estimates` ALTER COLUMN `currency` SET DEFAULT 'EUR';
UPDATE `estimates` SET `currency` = 'EUR' WHERE `currency` = 'USD';

ALTER TABLE `payments` ALTER COLUMN `currency` SET DEFAULT 'EUR';
UPDATE `payments` SET `currency` = 'EUR' WHERE `currency` = 'USD';

ALTER TABLE `expenses` ALTER COLUMN `currency` SET DEFAULT 'EUR';
UPDATE `expenses` SET `currency` = 'EUR' WHERE `currency` = 'USD';

-- 5. Update system_settings table if it exists
UPDATE `system_settings` SET `setting_value` = 'EUR' WHERE `setting_key` = 'default_currency';
UPDATE `system_settings` SET `setting_value` = 'Europe/Berlin' WHERE `setting_key` = 'default_timezone';
UPDATE `system_settings` SET `setting_value` = 'Germany' WHERE `setting_key` = 'company_country';
