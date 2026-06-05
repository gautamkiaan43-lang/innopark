-- ============================================================
-- Migration: Add missing columns to activities table
-- Run this on the production Railway database
-- ============================================================

-- entity_type column
ALTER TABLE `activities`
  ADD COLUMN IF NOT EXISTS `entity_type` VARCHAR(50) NULL AFTER `reference_type`;

-- entity_id column
ALTER TABLE `activities`
  ADD COLUMN IF NOT EXISTS `entity_id` INT NULL AFTER `reference_id`;

-- call_type column
ALTER TABLE `activities`
  ADD COLUMN IF NOT EXISTS `call_type` VARCHAR(20) NULL;

-- duration column (in minutes)
ALTER TABLE `activities`
  ADD COLUMN IF NOT EXISTS `duration` INT NULL DEFAULT 0;

-- email_subject column
ALTER TABLE `activities`
  ADD COLUMN IF NOT EXISTS `email_subject` VARCHAR(500) NULL;

-- email_body column
ALTER TABLE `activities`
  ADD COLUMN IF NOT EXISTS `email_body` TEXT NULL;

-- recipient_email column
ALTER TABLE `activities`
  ADD COLUMN IF NOT EXISTS `recipient_email` VARCHAR(255) NULL;

-- priority column
ALTER TABLE `activities`
  ADD COLUMN IF NOT EXISTS `priority` VARCHAR(20) NULL DEFAULT 'medium';

-- start_time column
ALTER TABLE `activities`
  ADD COLUMN IF NOT EXISTS `start_time` TIME NULL;

-- end_time column
ALTER TABLE `activities`
  ADD COLUMN IF NOT EXISTS `end_time` TIME NULL;

-- Widen the type column to VARCHAR(50) to support all activity types
ALTER TABLE `activities`
  MODIFY COLUMN `type` VARCHAR(50) NOT NULL DEFAULT 'note';

-- Widen the reference_type column to VARCHAR(50) to support meeting, task, etc.
ALTER TABLE `activities`
  MODIFY COLUMN `reference_type` VARCHAR(50) NULL;

-- Populate entity_type/entity_id from reference columns for old rows
UPDATE `activities`
  SET entity_type = reference_type,
      entity_id   = reference_id
WHERE (entity_type IS NULL OR entity_id IS NULL)
  AND reference_type IS NOT NULL
  AND reference_id IS NOT NULL;

-- Verify the table structure
SHOW COLUMNS FROM `activities`;
