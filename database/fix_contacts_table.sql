-- =====================================================
-- Fix contacts table structure
-- Run this if you already have the database set up
-- This adds missing columns for lead contacts functionality
-- =====================================================

-- Add 'company' column (for contact's company name)
ALTER TABLE `contacts`
ADD COLUMN `company` varchar(255) DEFAULT NULL AFTER `name`;

-- Add 'contact_type' column (Client, Lead, etc.)
ALTER TABLE `contacts`
ADD COLUMN `contact_type` varchar(50) DEFAULT 'Client' AFTER `country`;

-- Add 'assigned_user_id' column (for assigning contacts to users)
ALTER TABLE `contacts`
ADD COLUMN `assigned_user_id` int(10) UNSIGNED DEFAULT NULL AFTER `contact_type`;

-- Add 'status' column (Active, Inactive, etc.)
ALTER TABLE `contacts`
ADD COLUMN `status` varchar(50) DEFAULT 'Active' AFTER `assigned_user_id`;

-- Add index for better query performance
ALTER TABLE `contacts`
ADD INDEX `idx_contacts_assigned_user` (`assigned_user_id`),
ADD INDEX `idx_contacts_contact_type` (`contact_type`),
ADD INDEX `idx_contacts_status` (`status`);

-- Verify the changes
DESCRIBE contacts;
