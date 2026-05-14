-- =====================================================
-- Check if tables exist in database
-- Run this in phpMyAdmin to see which tables are missing
-- =====================================================

-- Check if main tables exist
SELECT 
    TABLE_NAME,
    CASE 
        WHEN TABLE_NAME IN (
            'users', 'companies', 'leads', 'clients', 'projects', 'tasks',
            'invoices', 'estimates', 'payments', 'expenses', 'contracts',
            'employees', 'attendance', 'time_logs', 'events', 'messages',
            'tickets', 'notifications', 'custom_fields', 'departments',
            'positions', 'roles', 'permissions'
        ) THEN '✓ Required'
        ELSE 'Optional'
    END AS status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'crm_db'
ORDER BY TABLE_NAME;

-- Count total tables
SELECT COUNT(*) as total_tables FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'crm_db';

-- List missing critical tables
SELECT 'users' as missing_table WHERE NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'crm_db' AND TABLE_NAME = 'users')
UNION ALL
SELECT 'companies' WHERE NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'crm_db' AND TABLE_NAME = 'companies')
UNION ALL
SELECT 'invoices' WHERE NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'crm_db' AND TABLE_NAME = 'invoices')
UNION ALL
SELECT 'clients' WHERE NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'crm_db' AND TABLE_NAME = 'clients')
UNION ALL
SELECT 'projects' WHERE NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'crm_db' AND TABLE_NAME = 'projects')
UNION ALL
SELECT 'tasks' WHERE NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'crm_db' AND TABLE_NAME = 'tasks');

