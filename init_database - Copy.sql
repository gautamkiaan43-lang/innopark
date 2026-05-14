-- Initialize crm_db_innopark database
USE crm_db_innopark;

-- Check if tables exist, if not run the full schema
-- This script should be run after importing schema.sql

-- Verify critical tables exist
SELECT 'Checking tables...' as status;

-- If you need to import the full schema, run schema.sql first
-- Then run this script to verify

SHOW TABLES;
