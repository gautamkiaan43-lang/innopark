-- =====================================================
-- Add SUPERADMIN Role to Database
-- =====================================================

-- Step 1: Alter users table to add SUPERADMIN to role enum
ALTER TABLE `users` 
MODIFY COLUMN `role` ENUM('ADMIN','EMPLOYEE','CLIENT','SUPERADMIN') NOT NULL DEFAULT 'EMPLOYEE';

-- Step 2: Create Super Admin User
-- Password: 123456 (hashed with bcrypt)
INSERT INTO `users` (
  `company_id`,
  `name`,
  `email`,
  `password`,
  `role`,
  `status`,
  `created_at`,
  `updated_at`,
  `is_deleted`
) VALUES (
  1,
  'Super Admin',
  'superadmin@gmail.com',
  '$2a$10$QR8/Bnb5q6nbyDb3Valf1eH40ErrQfztJUpIyq940BdGs6foL2zea',
  'SUPERADMIN',
  'Active',
  NOW(),
  NOW(),
  0
) ON DUPLICATE KEY UPDATE
  `role` = 'SUPERADMIN',
  `status` = 'Active',
  `updated_at` = NOW();

-- Verify the change
SELECT id, name, email, role, status FROM users WHERE role = 'SUPERADMIN';

