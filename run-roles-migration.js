require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const pool = require('./config/db');

async function migrate() {
    console.log('Starting Roles & Permissions Migration (Respecting Existing Schema)...');

    try {
        // 1. Roles table already exists with role_name.
        // Schema: id, company_id, role_name, description...
        console.log('Using existing roles table.');

        // 2. Create Permission Table (Role-Module Permissions)
        // Note: roles.id is INT UNSIGNED based on previous check
        await pool.execute(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT UNSIGNED NOT NULL,
        module VARCHAR(50) NOT NULL,
        can_view TINYINT(1) DEFAULT 0,
        can_add TINYINT(1) DEFAULT 0,
        can_edit TINYINT(1) DEFAULT 0,
        can_delete TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        UNIQUE KEY unique_role_module (role_id, module)
      )
    `);
        console.log('Role Permissions table created/verified.');

        // 2b. Ensure legacy schemas get module + CRUD columns
        const [cols] = await pool.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permissions'
    `);
        const names = new Set((cols || []).map(c => c.COLUMN_NAME));

        if (!names.has('module')) {
            await pool.execute(`ALTER TABLE role_permissions ADD COLUMN module VARCHAR(50) NULL AFTER role_id`);
            console.log('Added missing column: role_permissions.module');
        }
        if (!names.has('can_view')) {
            await pool.execute(`ALTER TABLE role_permissions ADD COLUMN can_view TINYINT(1) NOT NULL DEFAULT 0 AFTER module`);
            console.log('Added missing column: role_permissions.can_view');
        }
        if (!names.has('can_add')) {
            await pool.execute(`ALTER TABLE role_permissions ADD COLUMN can_add TINYINT(1) NOT NULL DEFAULT 0 AFTER can_view`);
            console.log('Added missing column: role_permissions.can_add');
        }
        if (!names.has('can_edit')) {
            await pool.execute(`ALTER TABLE role_permissions ADD COLUMN can_edit TINYINT(1) NOT NULL DEFAULT 0 AFTER can_add`);
            console.log('Added missing column: role_permissions.can_edit');
        }
        if (!names.has('can_delete')) {
            await pool.execute(`ALTER TABLE role_permissions ADD COLUMN can_delete TINYINT(1) NOT NULL DEFAULT 0 AFTER can_edit`);
            console.log('Added missing column: role_permissions.can_delete');
        }

        // Legacy schema compatibility: allow permission_id to be NULL for module-based RBAC rows
        if (names.has('permission_id')) {
            const [permMeta] = await pool.execute(`
        SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'role_permissions'
          AND COLUMN_NAME = 'permission_id'
        LIMIT 1
      `);
            if (permMeta[0]?.IS_NULLABLE !== 'YES') {
                await pool.execute(`ALTER TABLE role_permissions MODIFY permission_id INT UNSIGNED NULL`);
                console.log('Updated role_permissions.permission_id to nullable for module-based RBAC.');
            }
        }

        // Backfill module from permissions table for legacy rows
        await pool.execute(`
      UPDATE role_permissions rp
      INNER JOIN permissions p ON p.id = rp.permission_id
      SET rp.module = p.module
      WHERE rp.module IS NULL OR rp.module = ''
    `);
        console.log('Backfilled role_permissions.module from permissions table.');

        // 3. Seed Default Roles if empty
        const defaultRoles = ['ADMIN', 'EMPLOYEE', 'CLIENT', 'MANAGER', 'HR'];

        for (const r of defaultRoles) {
            // Check if exists
            const [existing] = await pool.execute('SELECT id FROM roles WHERE role_name = ?', [r]);
            if (existing.length === 0) {
                await pool.execute(
                    'INSERT INTO roles (company_id, role_name) VALUES (?, ?)',
                    [1, r]
                );
                console.log(`Seeded role: ${r}`);
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
