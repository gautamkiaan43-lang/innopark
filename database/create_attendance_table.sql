-- Attendance Schema Update
-- Run this in your database to add attendance functionality

-- Create attendance table
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `employee_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `date` DATE NOT NULL,
  `status` ENUM('present', 'absent', 'half_day', 'late', 'on_leave', 'holiday', 'day_off') DEFAULT 'present',
  `clock_in` TIME NULL,
  `clock_out` TIME NULL,
  `late_reason` TEXT NULL,
  `work_from` ENUM('office', 'home', 'other') DEFAULT 'office',
  `notes` TEXT NULL,
  `marked_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`marked_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_employee_date` (`employee_id`, `date`),
  INDEX `idx_attendance_company` (`company_id`),
  INDEX `idx_attendance_employee` (`employee_id`),
  INDEX `idx_attendance_date` (`date`),
  INDEX `idx_attendance_status` (`status`),
  INDEX `idx_attendance_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
