-- Make company_id nullable in finance_templates
ALTER TABLE `finance_templates` MODIFY COLUMN `company_id` INT UNSIGNED NULL;
