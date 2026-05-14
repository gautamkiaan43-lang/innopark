/**
 * Ensures users.rbac_role_id exists (links users.id → roles.id for per-employee menu/API RBAC).
 */
let ensured = false;

async function ensureUserRbacRoleColumn(pool) {
  if (ensured) return;
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'rbac_role_id'`
    );
    if (!rows?.length || rows[0].c === 0) {
      await pool.execute(
        `ALTER TABLE users ADD COLUMN rbac_role_id INT UNSIGNED NULL DEFAULT NULL`
      );
    }
  } catch (e) {
    const msg = String(e.message || '');
    if (!msg.includes('Duplicate column') && !msg.includes('already exists')) {
      console.warn('[ensureUserRbacRoleColumn]', msg);
    }
  }
  ensured = true;
}

module.exports = ensureUserRbacRoleColumn;
