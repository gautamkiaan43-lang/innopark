const pool = require('../config/db');

/**
 * Migration Service
 * Automatically handles database schema updates
 */
const migrationService = {
    run: async () => {
        console.log('🔄 Running auto-migrations...');
        try {
            // 1. Fix tasks table
            await migrationService.fixTasksTable();
            
            // 2. Fix invoices table
            await migrationService.fixInvoicesTable();
            
            // 3. Fix other tables (add is_deleted and company_id if missing)
            const tablesToFix = ['invoices', 'tasks', 'invoice_items', 'credit_notes', 'payments', 'activities'];
            for (const table of tablesToFix) {
                await migrationService.ensureStandardColumns(table);
            }

            // 4. Ensure activities has entity_type and entity_id columns
            await migrationService.ensureEntityColumnsForActivities();

            console.log('✅ Auto-migrations completed successfully!');
        } catch (error) {
            console.error('❌ Migration error:', error.message);
        }
    },

    fixInvoicesTable: async () => {
        try {
            console.log('🛠️ Fixing invoices table columns...');
            // Make client_id nullable
            await pool.execute(`ALTER TABLE invoices MODIFY COLUMN client_id INT NULL DEFAULT NULL`);
            
            // Fix billing_frequency truncation issues (common if it was a small ENUM or VARCHAR)
            await pool.execute(`ALTER TABLE invoices MODIFY COLUMN billing_frequency VARCHAR(50) DEFAULT NULL`);
            
            // Fix discount_type (sometimes limited to '%' or 'fixed')
            await pool.execute(`ALTER TABLE invoices MODIFY COLUMN discount_type VARCHAR(20) DEFAULT '%'`);
        } catch (error) {
            console.warn(`⚠️ Could not fix invoices table: ${error.message}`);
        }
    },

    fixTasksTable: async () => {
        try {
            // Check if 'code' column exists
            const [columns] = await pool.execute(`SHOW COLUMNS FROM tasks LIKE 'code'`);
            
            if (columns.length > 0) {
                // Column exists, make it nullable or give default
                console.log('🛠️ Altering tasks.code to be nullable...');
                await pool.execute(`ALTER TABLE tasks MODIFY COLUMN code VARCHAR(255) NULL DEFAULT NULL`);
            } else {
                // Column missing, add it as nullable
                console.log('🛠️ Adding tasks.code column...');
                await pool.execute(`ALTER TABLE tasks ADD COLUMN code VARCHAR(255) NULL DEFAULT NULL AFTER id`);
            }
        } catch (error) {
            console.warn(`⚠️ Could not fix tasks table: ${error.message}`);
        }
    },

    ensureStandardColumns: async (tableName) => {
        try {
            const [columns] = await pool.execute(`SHOW COLUMNS FROM ${tableName}`);
            const columnNames = columns.map(c => c.Field.toLowerCase());

            // Check is_deleted
            if (!columnNames.includes('is_deleted')) {
                console.log(`🛠️ Adding is_deleted to ${tableName}...`);
                await pool.execute(`ALTER TABLE ${tableName} ADD COLUMN is_deleted TINYINT(1) DEFAULT 0`);
            }

            // Check company_id
            if (!columnNames.includes('company_id')) {
                console.log(`🛠️ Adding company_id to ${tableName}...`);
                await pool.execute(`ALTER TABLE ${tableName} ADD COLUMN company_id INT DEFAULT 1`);
            }
        } catch (error) {
            console.warn(`⚠️ Could not ensure standard columns for ${tableName}: ${error.message}`);
        }
    },

    ensureEntityColumnsForActivities: async () => {
        try {
            const [columns] = await pool.execute(`SHOW COLUMNS FROM activities`);
            const columnNames = columns.map(c => c.Field.toLowerCase());

            let altered = false;
            if (!columnNames.includes('entity_type')) {
                console.log('🛠️ Adding entity_type to activities...');
                await pool.execute(`ALTER TABLE activities ADD COLUMN entity_type VARCHAR(50) NULL AFTER reference_type`);
                altered = true;
            }
            if (!columnNames.includes('entity_id')) {
                console.log('🛠️ Adding entity_id to activities...');
                await pool.execute(`ALTER TABLE activities ADD COLUMN entity_id INT NULL AFTER reference_id`);
                altered = true;
            }

            if (altered) {
                // Populate existing records with entity_type and entity_id from reference_type and reference_id
                console.log('🛠️ Populating entity_type and entity_id from reference_type/id...');
                await pool.execute(`UPDATE activities SET entity_type = reference_type, entity_id = reference_id WHERE entity_type IS NULL OR entity_id IS NULL`);

                // Create index on (entity_type, entity_id) if it doesn't exist
                console.log('🛠️ Creating index on activities (entity_type, entity_id)...');
                try {
                    await pool.execute(`CREATE INDEX idx_entity_type_id ON activities(entity_type, entity_id)`);
                } catch (idxError) {
                    console.warn(`⚠️ Could not create index (it might already exist): ${idxError.message}`);
                }
            }
        } catch (error) {
            console.warn(`⚠️ Could not ensure entity columns for activities: ${error.message}`);
        }
    }
};

module.exports = migrationService;
