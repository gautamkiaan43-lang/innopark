ALTER TABLE `users` ADD COLUMN `billing_address` TEXT NULL;
ALTER TABLE `users` ADD COLUMN `billing_city` VARCHAR(100) NULL;
ALTER TABLE `users` ADD COLUMN `billing_state` VARCHAR(100) NULL;
ALTER TABLE `users` ADD COLUMN `billing_country` VARCHAR(100) NULL;
ALTER TABLE `users` ADD COLUMN `billing_postal_code` VARCHAR(20) NULL;
