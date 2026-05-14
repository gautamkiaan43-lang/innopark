-- =====================================================
-- Update User Passwords Script
-- Run this if you already have the database set up
-- =====================================================

-- Update Admin password (Admin@123)
UPDATE `users` 
SET `password` = '$2a$10$GfWvRNlTDerXb5Ux4p/BPuiCI8uVAb/X1vSqg1CNKl7/MhOYvL4y.'
WHERE `email` = 'admin@crmapp.com' AND `role` = 'ADMIN';

-- Update Employee password (Demo@123)
UPDATE `users` 
SET `password` = '$2a$10$CyMeAtmMNZ478BjpE3FPBOHnRpOcDCmcc7KTM2atWJqiluvv/PTSq'
WHERE `email` = 'employee@demo.com' AND `role` = 'EMPLOYEE';

-- Update Client password (Demo@123)
UPDATE `users` 
SET `password` = '$2a$10$CyMeAtmMNZ478BjpE3FPBOHnRpOcDCmcc7KTM2atWJqiluvv/PTSq'
WHERE `email` = 'client@demo.com' AND `role` = 'CLIENT';

-- Verify passwords updated
SELECT id, name, email, role, 
       CASE 
         WHEN password LIKE '$2a$10$GfWvRNlTDerXb5Ux4p/BPuiCI8uVAb/X1vSqg1CNKl7/MhOYvL4y.' THEN 'Admin@123 ✓'
         WHEN password LIKE '$2a$10$CyMeAtmMNZ478BjpE3FPBOHnRpOcDCmcc7KTM2atWJqiluvv/PTSq' THEN 'Demo@123 ✓'
         ELSE 'Old Password ✗'
       END AS password_status
FROM `users` 
WHERE `email` IN ('admin@crmapp.com', 'employee@demo.com', 'client@demo.com')
ORDER BY id;

