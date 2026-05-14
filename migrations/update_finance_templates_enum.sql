-- Add 'proposal' to finance_templates type ENUM
ALTER TABLE `finance_templates` 
MODIFY COLUMN `type` ENUM('invoice', 'estimate', 'expense', 'proposal') NOT NULL;
