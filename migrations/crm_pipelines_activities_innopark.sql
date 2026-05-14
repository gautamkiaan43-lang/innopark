-- =====================================================
-- CRM Pipelines, Lead Sources & Activities Enhancement
-- Database: crm_db_innopark
-- Extends existing schema; does NOT drop existing tables/columns.
-- =====================================================

-- -----------------------------------------------------
-- 1. Lead Sources (configurable channels: Facebook, Phone, etc.)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `lead_sources` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) DEFAULT NULL,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_lead_sources_company` (`company_id`),
  KEY `idx_lead_sources_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 2. Lead Pipelines & Stages (configurable from Settings)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `lead_pipelines` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_lead_pipelines_company` (`company_id`),
  KEY `idx_lead_pipelines_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lead_pipeline_stages` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `pipeline_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `display_order` int(11) DEFAULT 0,
  `color` varchar(20) DEFAULT '#3B82F6',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_lead_stages_pipeline` (`pipeline_id`),
  KEY `idx_lead_stages_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 3. Deal Pipelines & Stages
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `deal_pipelines` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_deal_pipelines_company` (`company_id`),
  KEY `idx_deal_pipelines_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `deal_pipeline_stages` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `pipeline_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `display_order` int(11) DEFAULT 0,
  `color` varchar(20) DEFAULT '#3B82F6',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_deal_stages_pipeline` (`pipeline_id`),
  KEY `idx_deal_stages_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 4–7. Add columns only if they don't exist (idempotent; safe to re-run)
-- Uses stored procedure: checks INFORMATION_SCHEMA then ADD COLUMN
-- -----------------------------------------------------
DELIMITER $$

DROP PROCEDURE IF EXISTS add_crm_columns_if_missing$$

CREATE PROCEDURE add_crm_columns_if_missing()
BEGIN
  DECLARE db_name VARCHAR(64);
  SET db_name = DATABASE();

  -- leads: pipeline_id, stage_id, lead_source_id
  IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'pipeline_id') = 0 THEN
    ALTER TABLE `leads` ADD COLUMN `pipeline_id` int(10) UNSIGNED DEFAULT NULL;
  END IF;
  IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'stage_id') = 0 THEN
    ALTER TABLE `leads` ADD COLUMN `stage_id` int(10) UNSIGNED DEFAULT NULL;
  END IF;
  IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'lead_source_id') = 0 THEN
    ALTER TABLE `leads` ADD COLUMN `lead_source_id` int(10) UNSIGNED DEFAULT NULL;
  END IF;

  -- deals: pipeline_id, stage_id, contact_id
  IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'deals' AND COLUMN_NAME = 'pipeline_id') = 0 THEN
    ALTER TABLE `deals` ADD COLUMN `pipeline_id` int(10) UNSIGNED DEFAULT NULL;
  END IF;
  IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'deals' AND COLUMN_NAME = 'stage_id') = 0 THEN
    ALTER TABLE `deals` ADD COLUMN `stage_id` int(10) UNSIGNED DEFAULT NULL;
  END IF;
  IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'deals' AND COLUMN_NAME = 'contact_id') = 0 THEN
    ALTER TABLE `deals` ADD COLUMN `contact_id` int(10) UNSIGNED DEFAULT NULL;
  END IF;

  -- activities: is_pinned, follow_up_at, meeting_link
  IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'activities' AND COLUMN_NAME = 'is_pinned') = 0 THEN
    ALTER TABLE `activities` ADD COLUMN `is_pinned` tinyint(1) DEFAULT 0;
  END IF;
  IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'activities' AND COLUMN_NAME = 'follow_up_at') = 0 THEN
    ALTER TABLE `activities` ADD COLUMN `follow_up_at` datetime DEFAULT NULL;
  END IF;
  IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'activities' AND COLUMN_NAME = 'meeting_link') = 0 THEN
    ALTER TABLE `activities` ADD COLUMN `meeting_link` varchar(500) DEFAULT NULL;
  END IF;

  -- companies: delivery_address, object_address
  IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'delivery_address') = 0 THEN
    ALTER TABLE `companies` ADD COLUMN `delivery_address` text DEFAULT NULL;
  END IF;
  IF (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'object_address') = 0 THEN
    ALTER TABLE `companies` ADD COLUMN `object_address` text DEFAULT NULL;
  END IF;

END$$

DELIMITER ;

CALL add_crm_columns_if_missing();
DROP PROCEDURE IF EXISTS add_crm_columns_if_missing;

-- -----------------------------------------------------
-- 8. Seed default lead sources for existing companies (optional)
-- -----------------------------------------------------
-- INSERT INTO lead_sources (company_id, name, slug, display_order) 
-- SELECT id, 'Website', 'website', 1 FROM companies WHERE is_deleted = 0
-- ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
