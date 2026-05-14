-- Fix assigned_to column in activities table to handle NULLs correctly
-- Ensure the column is nullable and defaults to NULL
-- Also ensure is_pinned has a default value

ALTER TABLE activities 
MODIFY COLUMN assigned_to INT(10) UNSIGNED NULL DEFAULT NULL,
MODIFY COLUMN is_pinned TINYINT(1) DEFAULT 0;

-- Optional: Add index if missing (though it might already be there)
-- ALTER TABLE activities ADD INDEX idx_activities_assigned_to (assigned_to);
