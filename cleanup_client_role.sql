-- =====================================================
-- DATABASE CLEANUP: PERMANENT REMOVAL OF CLIENT ROLE
-- =====================================================

-- 1. Remove users with CLIENT role
DELETE FROM `users` WHERE `role` = 'CLIENT';

-- 2. Drop client-specific tables
-- Note: These tables were used exclusively by the Client module/portal
DROP TABLE IF EXISTS `client_labels`;
DROP TABLE IF EXISTS `client_groups`;
DROP TABLE IF EXISTS `client_managers`;
DROP TABLE IF EXISTS `client_contacts`;
DROP TABLE IF EXISTS `subscriptions`;

-- 3. Cleanup module-specific data traces
-- We keep 'clients' table for CRM record keeping but remove it from the sidebar/UI.
-- However, if the user wants FULL purging, we can also remove 'client_id' columns.
-- Re-adding columns is harder, so we'll just purge the portal-specific logic for now.

-- Remove client-specific permissions
DELETE FROM `permissions` WHERE `module` = 'Clients' OR `name` LIKE 'clients.%';
DELETE FROM `role_permissions` WHERE `permission_id` NOT IN (SELECT `id` FROM `permissions`);

-- 4. Audit Log Cleanup
DELETE FROM `audit_logs` WHERE `module` = 'Clients';

-- 5. System Settings Cleanup
DELETE FROM `system_settings` WHERE `setting_key` LIKE '%client%';
