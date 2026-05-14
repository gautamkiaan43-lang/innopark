-- =====================================================
-- Add Groups Feature for Messaging
-- =====================================================

-- Groups table
CREATE TABLE IF NOT EXISTS `groups` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_group_company` (`company_id`),
  INDEX `idx_group_created_by` (`created_by`),
  INDEX `idx_group_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Group Members table (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS `group_members` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `group_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_group_user` (`group_id`, `user_id`),
  INDEX `idx_group_member_group` (`group_id`),
  INDEX `idx_group_member_user` (`user_id`),
  INDEX `idx_group_member_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update messages table to support groups
-- Note: Run these ALTER statements separately and check if column/index exists first
-- ALTER TABLE `messages` ADD COLUMN `group_id` INT UNSIGNED NULL AFTER `to_user_id`;
-- ALTER TABLE `messages` ADD INDEX `idx_message_group` (`group_id`);
-- ALTER TABLE `messages` ADD CONSTRAINT `fk_message_group` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE;

