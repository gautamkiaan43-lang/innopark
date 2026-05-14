-- =====================================================
-- Update Activities Table - Add Task and Comment Types
-- =====================================================
-- This migration adds 'task' and 'comment' to the activities.type ENUM
-- as per client requirements for Activity Timeline tabs

-- Step 1: Modify the ENUM to include 'task' and 'comment'
ALTER TABLE `activities` 
MODIFY COLUMN `type` ENUM('call','meeting','note','email','task','comment') NOT NULL;

-- Verify the change
-- SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = DATABASE() 
-- AND TABLE_NAME = 'activities' 
-- AND COLUMN_NAME = 'type';

