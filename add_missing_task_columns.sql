-- Add missing columns to tasks table for linking to Deals, Contacts, and Companies
ALTER TABLE tasks 
ADD COLUMN deal_id INT(10) UNSIGNED DEFAULT NULL AFTER lead_id,
ADD COLUMN contact_id INT(10) UNSIGNED DEFAULT NULL AFTER deal_id,
ADD COLUMN related_company_id INT(10) UNSIGNED DEFAULT NULL AFTER contact_id;

-- Add indexes for better performance
ALTER TABLE tasks ADD INDEX (deal_id);
ALTER TABLE tasks ADD INDEX (contact_id);
ALTER TABLE tasks ADD INDEX (related_company_id);
