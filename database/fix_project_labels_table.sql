-- =====================================================
-- Fix project_labels table structure
-- Run this if you already have the database set up
-- =====================================================

-- Drop the old table and recreate with correct structure
DROP TABLE IF EXISTS `project_labels`;

CREATE TABLE `project_labels` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `color` varchar(20) DEFAULT '#3B82F6',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_project_labels_company` (`company_id`),
  KEY `idx_project_labels_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify the change
DESCRIBE project_labels;
