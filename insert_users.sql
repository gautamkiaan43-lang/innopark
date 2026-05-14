-- =====================================================
-- Insert Users - Copy and paste this in phpMyAdmin SQL tab
-- =====================================================

-- First, make sure company exists
INSERT INTO `companies` (`id`, `name`, `currency`, `timezone`, `created_at`, `updated_at`, `is_deleted`) 
VALUES (1, 'Default Company', 'USD', 'UTC', NOW(), NOW(), 0)
ON DUPLICATE KEY UPDATE `name` = 'Default Company';

-- Insert Admin User (Password: Admin@123)
INSERT INTO `users` (`company_id`, `name`, `email`, `password`, `role`, `status`, `created_at`, `updated_at`, `is_deleted`) 
VALUES 
(1, 'Super Admin', 'admin@crmapp.com', '$2a$10$GfWvRNlTDerXb5Ux4p/BPuiCI8uVAb/X1vSqg1CNKl7/MhOYvL4y.', 'ADMIN', 'Active', NOW(), NOW(), 0)
ON DUPLICATE KEY UPDATE 
  `password` = '$2a$10$GfWvRNlTDerXb5Ux4p/BPuiCI8uVAb/X1vSqg1CNKl7/MhOYvL4y.',
  `status` = 'Active';

-- Insert Employee User (Password: Demo@123)
INSERT INTO `users` (`company_id`, `name`, `email`, `password`, `role`, `status`, `phone`, `address`, `created_at`, `updated_at`, `is_deleted`) 
VALUES 
(1, 'Demo Employee', 'employee@demo.com', '$2a$10$CyMeAtmMNZ478BjpE3FPBOHnRpOcDCmcc7KTM2atWJqiluvv/PTSq', 'EMPLOYEE', 'Active', '+1-555-0101', '123 Employee St, New York', NOW(), NOW(), 0)
ON DUPLICATE KEY UPDATE 
  `password` = '$2a$10$CyMeAtmMNZ478BjpE3FPBOHnRpOcDCmcc7KTM2atWJqiluvv/PTSq',
  `status` = 'Active';

-- Insert Client User (Password: Demo@123)
INSERT INTO `users` (`company_id`, `name`, `email`, `password`, `role`, `status`, `phone`, `address`, `created_at`, `updated_at`, `is_deleted`) 
VALUES 
(1, 'Demo Client', 'client@demo.com', '$2a$10$CyMeAtmMNZ478BjpE3FPBOHnRpOcDCmcc7KTM2atWJqiluvv/PTSq', 'CLIENT', 'Active', '+1-555-0201', '456 Client Ave, Chicago', NOW(), NOW(), 0)
ON DUPLICATE KEY UPDATE 
  `password` = '$2a$10$CyMeAtmMNZ478BjpE3FPBOHnRpOcDCmcc7KTM2atWJqiluvv/PTSq',
  `status` = 'Active';

-- Verify users inserted
SELECT id, name, email, role, status, 
       CASE 
         WHEN password = '$2a$10$GfWvRNlTDerXb5Ux4p/BPuiCI8uVAb/X1vSqg1CNKl7/MhOYvL4y.' THEN 'Admin@123 ✓'
         WHEN password = '$2a$10$CyMeAtmMNZ478BjpE3FPBOHnRpOcDCmcc7KTM2atWJqiluvv/PTSq' THEN 'Demo@123 ✓'
         ELSE 'Unknown'
       END AS password_info
FROM `users` 
WHERE `email` IN ('admin@crmapp.com', 'employee@demo.com', 'client@demo.com')
ORDER BY id;

