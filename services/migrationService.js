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

            // 5. Ensure lead conversion schema is aligned
            await migrationService.ensureLeadConversionSchema();

            // 6. Ensure custom sections schema is aligned
            await migrationService.ensureCustomSectionsSchema();

            // 7. Ensure user view preferences schema is aligned
            await migrationService.ensureUserViewPreferencesSchema();

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

            // Check and add is_pinned
            const [pinnedCol] = await pool.execute(`SHOW COLUMNS FROM tasks LIKE 'is_pinned'`);
            if (pinnedCol.length === 0) {
                console.log('🛠️ Adding tasks.is_pinned column...');
                await pool.execute(`ALTER TABLE tasks ADD COLUMN is_pinned TINYINT(1) DEFAULT 0`);
            }

            // Check and add is_completed
            const [completedCol] = await pool.execute(`SHOW COLUMNS FROM tasks LIKE 'is_completed'`);
            if (completedCol.length === 0) {
                console.log('🛠️ Adding tasks.is_completed column...');
                await pool.execute(`ALTER TABLE tasks ADD COLUMN is_completed TINYINT(1) DEFAULT 0`);
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
    },

    ensureLeadConversionSchema: async () => {
        try {
            console.log('🛠️ Ensuring lead conversion schema is aligned...');
            
            // 1. Leads table: Check/Add columns
            const [leadColumns] = await pool.execute(`SHOW COLUMNS FROM leads`);
            const leadColumnNames = leadColumns.map(c => c.Field.toLowerCase());
            
            if (!leadColumnNames.includes('name')) {
                console.log('🛠️ Adding leads.name column...');
                await pool.execute(`ALTER TABLE leads ADD COLUMN name VARCHAR(255) NULL AFTER id`);
            }
            if (!leadColumnNames.includes('assigned_to')) {
                console.log('🛠️ Adding leads.assigned_to column...');
                await pool.execute(`ALTER TABLE leads ADD COLUMN assigned_to INT UNSIGNED NULL AFTER owner_id`);
            }
            
            // Modify leads.status ENUM to include 'converted'
            console.log('🛠️ Modifying leads.status to support converted status...');
            await pool.execute(`ALTER TABLE leads MODIFY COLUMN status ENUM('New','Qualified','Discussion','Negotiation','Won','Lost','converted') DEFAULT 'New'`);
            
            // Sync leads data
            await pool.execute(`UPDATE leads SET name = person_name WHERE name IS NULL AND person_name IS NOT NULL`);
            await pool.execute(`UPDATE leads SET assigned_to = owner_id WHERE assigned_to IS NULL AND owner_id IS NOT NULL`);

            // 2. Companies table: Check/Add company_name
            const [companyColumns] = await pool.execute(`SHOW COLUMNS FROM companies`);
            const companyColumnNames = companyColumns.map(c => c.Field.toLowerCase());
            
            if (!companyColumnNames.includes('company_name')) {
                console.log('🛠️ Adding companies.company_name column...');
                await pool.execute(`ALTER TABLE companies ADD COLUMN company_name VARCHAR(255) NULL AFTER name`);
            }
            await pool.execute(`UPDATE companies SET company_name = name WHERE company_name IS NULL AND name IS NOT NULL`);

            // 3. Deals table: Check/Add stage and value
            const [dealColumns] = await pool.execute(`SHOW COLUMNS FROM deals`);
            const dealColumnNames = dealColumns.map(c => c.Field.toLowerCase());
            
            if (!dealColumnNames.includes('stage')) {
                console.log('🛠️ Adding deals.stage column...');
                await pool.execute(`ALTER TABLE deals ADD COLUMN stage VARCHAR(50) NULL DEFAULT 'New' AFTER stage_id`);
            }
            if (!dealColumnNames.includes('value')) {
                console.log('🛠️ Adding deals.value column...');
                await pool.execute(`ALTER TABLE deals ADD COLUMN value DECIMAL(15,2) NULL DEFAULT 0.00 AFTER stage`);
            }
            await pool.execute(`UPDATE deals SET stage = 'New' WHERE stage IS NULL`);
            await pool.execute(`UPDATE deals SET value = total WHERE value IS NULL OR value = 0.00`);
            
            console.log('✅ Lead conversion schema aligned successfully!');
        } catch (error) {
            console.error('❌ Lead conversion schema alignment error:', error.message);
        }
    },

    ensureCustomSectionsSchema: async () => {
        try {
            console.log('🛠️ Ensuring custom sections schema is aligned...');
            
            // 1. Create custom_sections table if it doesn't exist
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS custom_sections (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    company_id INT UNSIGNED NOT NULL DEFAULT 1,
                    module_name VARCHAR(50) NOT NULL,
                    section_name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            
            // 2. Add section_id to custom_fields table if it doesn't exist
            const [columns] = await pool.execute(`SHOW COLUMNS FROM custom_fields`);
            const columnNames = columns.map(c => c.Field.toLowerCase());
            
            if (!columnNames.includes('section_id')) {
                console.log('🛠️ Adding custom_fields.section_id column...');
                await pool.execute(`ALTER TABLE custom_fields ADD COLUMN section_id INT UNSIGNED NULL AFTER company_id`);
                
                // Add foreign key constraint
                try {
                    await pool.execute(`
                        ALTER TABLE custom_fields 
                        ADD CONSTRAINT fk_custom_fields_section 
                        FOREIGN KEY (section_id) REFERENCES custom_sections(id) ON DELETE SET NULL
                    `);
                } catch (fkError) {
                    console.warn(`⚠️ Could not add foreign key constraint on section_id: ${fkError.message}`);
                }
            }
            
            console.log('✅ Custom sections schema aligned successfully!');
        } catch (error) {
            console.error('❌ Custom sections schema alignment error:', error.message);
        }
    },

    ensureUserViewPreferencesSchema: async () => {
        try {
            console.log('🛠️ Ensuring user view preferences schema is aligned...');
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS user_view_preferences (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    user_id INT UNSIGNED NOT NULL,
                    module_name VARCHAR(100) NOT NULL,
                    view_type VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_user_module (user_id, module_name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('✅ User view preferences schema aligned successfully!');
        } catch (error) {
            console.error('❌ User view preferences schema alignment error:', error.message);
        }
    }
};

module.exports = migrationService;
