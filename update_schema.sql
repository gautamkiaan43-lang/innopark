-- Add new columns to users table
ALTER TABLE `users`
ADD COLUMN `country` VARCHAR(100) NULL,
ADD COLUMN `email_notifications` TINYINT(1) DEFAULT 1;

-- Add new columns to employees table
ALTER TABLE `employees`
ADD COLUMN `salutation` VARCHAR(20) NULL,
ADD COLUMN `date_of_birth` DATE NULL,
ADD COLUMN `gender` ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
ADD COLUMN `reporting_to` INT UNSIGNED NULL,
ADD COLUMN `language` VARCHAR(50) DEFAULT 'en',
ADD COLUMN `about` TEXT NULL,
ADD COLUMN `hourly_rate` DECIMAL(10, 2) NULL,
ADD COLUMN `slack_member_id` VARCHAR(100) NULL,
ADD COLUMN `skills` TEXT NULL,
ADD COLUMN `probation_end_date` DATE NULL,
ADD COLUMN `notice_period_start_date` DATE NULL,
ADD COLUMN `notice_period_end_date` DATE NULL,
ADD COLUMN `employment_type` ENUM('Full Time', 'Part Time', 'Contract', 'Internship', 'Trainee') DEFAULT 'Full Time',
ADD COLUMN `marital_status` ENUM('Single', 'Married', 'Widowed', 'Divorced', 'Separated') DEFAULT 'Single',
ADD COLUMN `business_address` TEXT NULL;

-- Add Foreign Key constraint for reporting_to
ALTER TABLE `employees`
ADD CONSTRAINT `employees_reporting_to_fk`
FOREIGN KEY (`reporting_to`) REFERENCES `users`(`id`) ON DELETE SET NULL;
