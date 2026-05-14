const pool = require('../config/db');

const ensureRolePermissionsCrudSchema = async () => {
    const [cols] = await pool.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permissions'`
    );
    const names = new Set((cols || []).map(c => c.COLUMN_NAME));

    if (!names.has('module')) {
        await pool.execute(`ALTER TABLE role_permissions ADD COLUMN module VARCHAR(50) NULL AFTER role_id`);
    }
    if (!names.has('can_view')) {
        await pool.execute(`ALTER TABLE role_permissions ADD COLUMN can_view TINYINT(1) NOT NULL DEFAULT 0 AFTER module`);
    }
    if (!names.has('can_add')) {
        await pool.execute(`ALTER TABLE role_permissions ADD COLUMN can_add TINYINT(1) NOT NULL DEFAULT 0 AFTER can_view`);
    }
    if (!names.has('can_edit')) {
        await pool.execute(`ALTER TABLE role_permissions ADD COLUMN can_edit TINYINT(1) NOT NULL DEFAULT 0 AFTER can_add`);
    }
    if (!names.has('can_delete')) {
        await pool.execute(`ALTER TABLE role_permissions ADD COLUMN can_delete TINYINT(1) NOT NULL DEFAULT 0 AFTER can_edit`);
    }

    // Legacy schema compatibility: old table had permission_id NOT NULL
    // but module-based RBAC inserts do not provide permission_id.
    if (names.has('permission_id')) {
        const [meta] = await pool.execute(
            `SELECT IS_NULLABLE
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'role_permissions'
               AND COLUMN_NAME = 'permission_id'
             LIMIT 1`
        );
        const isNullable = meta?.[0]?.IS_NULLABLE === 'YES';
        if (!isNullable) {
            await pool.execute(`ALTER TABLE role_permissions MODIFY permission_id INT UNSIGNED NULL`);
        }
    }

    // Backfill module names from permissions table for legacy schema rows
    await pool.execute(
        `UPDATE role_permissions rp
         INNER JOIN permissions p ON p.id = rp.permission_id
         SET rp.module = p.module
         WHERE rp.module IS NULL OR rp.module = ''`
    );
};

const getRoles = async (req, res) => {
    try {
        const companyId = req.companyId || req.query.company_id || 1;
        const [roles] = await pool.execute(
            `SELECT id, role_name, description FROM roles WHERE company_id = ? AND is_deleted = 0`,
            [companyId]
        );
        res.json({ success: true, data: roles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const getRolePermissions = async (req, res) => {
    try {
        const { id } = req.params;
        await ensureRolePermissionsCrudSchema();
        const [perms] = await pool.execute(
            `SELECT module, can_view, can_add, can_edit, can_delete
             FROM role_permissions
             WHERE role_id = ? AND module IS NOT NULL AND module <> ''`,
            [id]
        );
        res.json({ success: true, data: perms });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const updateRolePermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body; // array
        await ensureRolePermissionsCrudSchema();

        if (!Array.isArray(permissions)) {
            return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_9cad370a') : "Permissions must be an array" });
        }

        for (const p of permissions) {
            const [exists] = await pool.execute(
                'SELECT id FROM role_permissions WHERE role_id = ? AND module = ?',
                [id, p.module]
            );

            if (exists.length > 0) {
                await pool.execute(
                    `UPDATE role_permissions SET 
                 can_view = ?, can_add = ?, can_edit = ?, can_delete = ? 
                 WHERE id = ?`,
                    [p.can_view ? 1 : 0, p.can_add ? 1 : 0, p.can_edit ? 1 : 0, p.can_delete ? 1 : 0, exists[0].id]
                );
            } else {
                await pool.execute(
                    `INSERT INTO role_permissions (role_id, module, can_view, can_add, can_edit, can_delete)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                    [id, p.module, p.can_view ? 1 : 0, p.can_add ? 1 : 0, p.can_edit ? 1 : 0, p.can_delete ? 1 : 0]
                );
            }
        }

        res.json({ success: true, message: req.t ? req.t('api_msg_824e0736') : "Permissions updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const addRole = async (req, res) => {
    try {
        const { roleName, description } = req.body;
        const companyId = req.companyId || req.body.company_id || 1;

        const [result] = await pool.execute(
            'INSERT INTO roles (company_id, role_name, description) VALUES (?, ?, ?)',
            [companyId, roleName, description || '']
        );

        res.json({ success: true, data: { id: result.insertId, role_name: roleName } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('UPDATE roles SET is_deleted = 1 WHERE id = ?', [id]);
        res.json({ success: true, message: req.t ? req.t('api_msg_e6422380') : "Role deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { getRoles, getRolePermissions, updateRolePermissions, addRole, deleteRole };
