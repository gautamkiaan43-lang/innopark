-- Migration: Add assigned_to, pipeline_id, stage_id to deals table
-- Run this once to update the existing deals table

ALTER TABLE `deals`
  ADD COLUMN IF NOT EXISTS `pipeline_id` INT UNSIGNED NULL AFTER `status`,
  ADD COLUMN IF NOT EXISTS `stage_id` INT UNSIGNED NULL AFTER `pipeline_id`,
  ADD COLUMN IF NOT EXISTS `assigned_to` INT UNSIGNED NULL AFTER `stage_id`;

-- Add indexes for performance
ALTER TABLE `deals`
  ADD INDEX IF NOT EXISTS `idx_deals_pipeline_id` (`pipeline_id`),
  ADD INDEX IF NOT EXISTS `idx_deals_stage_id` (`stage_id`),
  ADD INDEX IF NOT EXISTS `idx_deals_assigned_to` (`assigned_to`);
