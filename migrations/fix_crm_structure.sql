-- =====================================================
-- CRM STRUCTURE FIX MIGRATION
-- =====================================================
-- Purpose: Fix CRM structure to follow HubSpot-style organization
-- Date: 2026-02-05
-- 
-- Changes:
-- 1. Remove contact_type from contacts table (contacts = only individuals)
-- 2. Ensure companies table is properly structured
-- 3. Add proper foreign keys and relationships
-- 4. Preserve all existing data
-- =====================================================

-- BACKUP REMINDER: Always backup your database before running migrations!

START TRANSACTION;

-- =====================================================
-- STEP 1: Backup existing contact_type data (just in case)
-- =====================================================
ALTER TABLE `contacts` 
ADD COLUMN `contact_type_backup` varchar(50) DEFAULT NULL AFTER `contact_type`;

UPDATE `contacts` 
SET `contact_type_backup` = `contact_type`;

-- =====================================================
-- STEP 2: Remove contact_type column from contacts
-- =====================================================
-- Contacts should only represent individuals, not types
ALTER TABLE `contacts` 
DROP COLUMN `contact_type`;

-- =====================================================
-- STEP 3: Update contacts table structure
-- =====================================================
-- Ensure contacts table has proper company reference
-- The 'company' field should reference companies table via client_id

-- Add index for better performance
ALTER TABLE `contacts` 
ADD INDEX `idx_client_id` (`client_id`),
ADD INDEX `idx_lead_id` (`lead_id`),
ADD INDEX `idx_company_id` (`company_id`);

-- =====================================================
-- STEP 4: Ensure companies table is properly structured
-- =====================================================
-- Companies table already exists and looks good
-- Add indexes for performance
ALTER TABLE `companies` 
ADD INDEX `idx_company_name` (`name`),
ADD INDEX `idx_package_id` (`package_id`);

-- =====================================================
-- STEP 5: Ensure clients table is properly structured
-- =====================================================
-- Clients table represents organizations/companies
-- Add indexes for performance
ALTER TABLE `clients` 
ADD INDEX `idx_company_name` (`company_name`),
ADD INDEX `idx_owner_id` (`owner_id`);

-- =====================================================
-- STEP 6: Update deals table to ensure proper relationships
-- =====================================================
-- Deals should link to companies and contacts
ALTER TABLE `deals` 
ADD INDEX `idx_client_id` (`client_id`),
ADD INDEX `idx_lead_id` (`lead_id`),
ADD INDEX `idx_contact_id` (`contact_id`);

-- =====================================================
-- STEP 7: Ensure deal_contacts junction table exists
-- =====================================================
-- This table already exists and is properly structured
ALTER TABLE `deal_contacts` 
ADD INDEX `idx_deal_id` (`deal_id`),
ADD INDEX `idx_contact_id` (`contact_id`);

-- =====================================================
-- STEP 8: Update activities table for better timeline support
-- =====================================================
-- Activities table already has reference_type and reference_id
-- Add indexes for performance
ALTER TABLE `activities` 
ADD INDEX `idx_reference` (`reference_type`, `reference_id`),
ADD INDEX `idx_lead_id` (`lead_id`),
ADD INDEX `idx_company_id` (`company_id`),
ADD INDEX `idx_contact_id` (`contact_id`),
ADD INDEX `idx_deal_id` (`deal_id`),
ADD INDEX `idx_created_at` (`created_at`);

-- =====================================================
-- STEP 9: Add comments to tables for clarity
-- =====================================================
ALTER TABLE `contacts` 
COMMENT = 'Stores individual people/contacts only (no types)';

ALTER TABLE `companies` 
COMMENT = 'Stores organizations/companies managed by the system';

ALTER TABLE `clients` 
COMMENT = 'Stores client organizations (can be Person or Organization type)';

ALTER TABLE `deals` 
COMMENT = 'Business opportunities linked to companies and contacts';

ALTER TABLE `activities` 
COMMENT = 'Activity timeline for leads, contacts, companies, and deals';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (Run these to verify migration)
-- =====================================================
-- SELECT COUNT(*) as total_contacts FROM contacts;
-- SELECT COUNT(*) as total_companies FROM companies;
-- SELECT COUNT(*) as total_clients FROM clients;
-- SELECT COUNT(*) as total_deals FROM deals;
-- SELECT COUNT(*) as total_activities FROM activities;
-- SHOW INDEX FROM contacts;
-- SHOW INDEX FROM companies;
-- SHOW INDEX FROM deals;
-- SHOW INDEX FROM activities;
