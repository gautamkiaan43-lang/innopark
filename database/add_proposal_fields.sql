-- Add missing fields to estimates table for simplified proposal structure
ALTER TABLE `estimates` 
ADD COLUMN `proposal_date` DATE NULL AFTER `estimate_number`,
ADD COLUMN `tax` VARCHAR(50) NULL AFTER `note`,
ADD COLUMN `second_tax` VARCHAR(50) NULL AFTER `tax`;
