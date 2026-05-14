-- 1. Tasks Table
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `company_id` INT UNSIGNED NOT NULL DEFAULT 1,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `due_date` DATETIME NOT NULL,
  `priority` ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  `status` ENUM('Pending', 'Completed', 'Overdue') NOT NULL DEFAULT 'Pending',
  `assigned_to` INT UNSIGNED NOT NULL,
  `reminder_datetime` DATETIME DEFAULT NULL,
  `related_to_type` ENUM('lead', 'deal', 'contact', 'company') DEFAULT NULL,
  `related_to_id` INT DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_assigned` (`assigned_to`),
  KEY `idx_tasks_due_date` (`due_date`),
  KEY `idx_tasks_related` (`related_to_type`, `related_to_id`),
  CONSTRAINT `fk_tasks_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Meetings Table
CREATE TABLE IF NOT EXISTS `meetings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `company_id` INT UNSIGNED NOT NULL DEFAULT 1,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `meeting_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `assigned_to` INT UNSIGNED NOT NULL,
  `reminder_datetime` DATETIME DEFAULT NULL,
  `related_to_type` ENUM('lead', 'deal', 'contact', 'company') DEFAULT NULL,
  `related_to_id` INT DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_meetings_assigned` (`assigned_to`),
  KEY `idx_meetings_date` (`meeting_date`),
  KEY `idx_meetings_related` (`related_to_type`, `related_to_id`),
  CONSTRAINT `fk_meetings_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
