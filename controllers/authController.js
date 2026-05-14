// =====================================================
// Authentication Controller
// =====================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const ensureUserRbacRoleColumn = require('../utils/ensureUserRbacRoleColumn');

async function attachRbacPermissions(userRow) {
  if (!userRow || userRow.role !== 'EMPLOYEE') {
    return { ...userRow, rbac_permissions: null };
  }
  try {
    let effectiveRoleId = userRow.rbac_role_id;

    // Fallback: if employee has no explicit rbac_role_id, use company EMPLOYEE role template
    if (!effectiveRoleId) {
      const [roleRows] = await pool.execute(
        `SELECT id FROM roles
         WHERE company_id = ? AND UPPER(role_name) = 'EMPLOYEE' AND is_deleted = 0
         ORDER BY id ASC
         LIMIT 1`,
        [userRow.company_id]
      );
      effectiveRoleId = roleRows?.[0]?.id || null;
    }

    if (!effectiveRoleId) {
      return { ...userRow, rbac_permissions: null };
    }

    const [perms] = await pool.execute(
      `SELECT module, can_view, can_add, can_edit, can_delete
       FROM role_permissions
       WHERE role_id = ? AND module IS NOT NULL AND module <> ''`,
      [effectiveRoleId]
    );
    const rbac_permissions = {};
    (perms || []).forEach((p) => {
      rbac_permissions[p.module] = {
        can_view: !!(p.can_view === 1 || p.can_view === true),
        can_add: !!(p.can_add === 1 || p.can_add === true),
        can_edit: !!(p.can_edit === 1 || p.can_edit === true),
        can_delete: !!(p.can_delete === 1 || p.can_delete === true),
      };
    });
    return { ...userRow, rbac_role_id: effectiveRoleId, rbac_permissions };
  } catch (e) {
    console.warn('attachRbacPermissions:', e.message);
    return { ...userRow, rbac_permissions: null };
  }
}

// Hardcoded Data for Bypass
const BYPASS_USERS_DATA = {
  1: { id: 1, company_id: 1, name: 'Super Admin', email: 'superadmin@crmapp', role: 'SUPERADMIN', status: 'Active', company_name: 'Innopark Demo' },
  2: { id: 2, company_id: 1, name: 'Kavya', email: 'kavya@gmail.com', role: 'ADMIN', status: 'Active', company_name: 'Innopark Demo' },
  4: { id: 4, company_id: 1, name: 'Devesh', email: 'devesh@gmail.com', role: 'EMPLOYEE', status: 'Active', company_name: 'Innopark Demo' }
};

/** Merge bypass stub with DB row so company_id matches messaging / SQL (fixes stale company_id: 1 in UI). */
async function mergeBypassUserWithDb(stub, loginEmail) {
  try {
    await ensureUserRbacRoleColumn(pool);
    const [rows] = await pool.execute(
      `SELECT u.id, u.company_id, u.name, u.email, u.role, u.status, u.rbac_role_id, c.name AS company_name
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = ? AND u.is_deleted = 0`,
      [stub.id]
    );
    if (rows.length === 0) return { ...stub, email: loginEmail };
    const u = rows[0];
    return {
      id: u.id,
      company_id: u.company_id,
      name: u.name || stub.name,
      email: u.email || loginEmail,
      role: u.role || stub.role,
      status: u.status || stub.status,
      company_name: u.company_name || stub.company_name,
      rbac_role_id: u.rbac_role_id ?? null,
    };
  } catch {
    return { ...stub, email: loginEmail };
  }
}

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_5f4480ad') : "Email, Password and Role are required" });
    }

    const normalizedRole = (role || '').toUpperCase().replace(/\s/g, '_');
    
    console.log(`Login Attempt: Email=${email}, Role=${role}, NormalizedRole=${normalizedRole}`);

    // =====================================================
    // LOGIN BYPASS (Works even if DB is offline)
    // =====================================================
    const bypassEmails = {
      'superadmin@crmapp': BYPASS_USERS_DATA[1],
      'kavya@gmail.com': BYPASS_USERS_DATA[2],
      'devesh@gmail.com': BYPASS_USERS_DATA[4]
    };

    if (bypassEmails[email] && password === '123456') {
      const stub = bypassEmails[email];
      let user = await mergeBypassUserWithDb(stub, email);
      user = await attachRbacPermissions(user);

      const token = jwt.sign(
        { userId: user.id, companyId: user.company_id, role: user.role },
        process.env.JWT_SECRET || 'worksuite_crm_jwt_secret_key_2025_change_in_production',
        { expiresIn: '24h' }
      );

      console.log(`Bypass Success for ${email}`);
      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          company_id: user.company_id,
          name: user.name,
          email: user.email,
          role: user.role,
          company_name: user.company_name,
          rbac_role_id: user.rbac_role_id ?? null,
          rbac_permissions: user.rbac_permissions ?? null,
        }
      });
    }
    // =====================================================

    await ensureUserRbacRoleColumn(pool);

    // Fallback to database
    const [users] = await pool.execute(
      `SELECT id, company_id, name, email, password, role, status, rbac_role_id FROM users WHERE email = ? AND UPPER(role) = ? AND is_deleted = 0`,
      [email, normalizedRole]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: req.t ? req.t('api_msg_e6839791') : "Invalid credentials" });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ success: false, error: req.t ? req.t('api_msg_e6839791') : "Invalid credentials" });

    const withPerms = await attachRbacPermissions(user);

    const jwtSecret = process.env.JWT_SECRET || 'worksuite_crm_jwt_secret_key_2025_change_in_production';
    const token = jwt.sign(
      { userId: user.id, companyId: user.company_id, role: user.role }, 
      jwtSecret, 
      { expiresIn: '24h' }
    );
    
    res.json({ 
      success: true, 
      token, 
      user: {
        id: withPerms.id,
        company_id: withPerms.company_id,
        name: withPerms.name,
        email: withPerms.email,
        role: withPerms.role,
        rbac_role_id: withPerms.rbac_role_id ?? null,
        rbac_permissions: withPerms.rbac_permissions ?? null,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_48649d8c') : "Login failed" });
  }
};

/**
 * Get current user (With Bypass)
 */
const getCurrentUser = async (req, res) => {
  try {
    const userIdRaw = req.userId || req.query.user_id || req.body.user_id;
    if (!userIdRaw) return res.status(400).json({ success: false, error: req.t ? req.t('api_msg_56a8e6a1') : "User ID required" });

    const uid = parseInt(userIdRaw, 10);
    if (!Number.isFinite(uid)) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }

    try {
      await ensureUserRbacRoleColumn(pool);
      const [users] = await pool.execute(
        `SELECT u.id, u.company_id, u.name, u.email, u.role, u.status, u.rbac_role_id, c.name AS company_name
         FROM users u
         LEFT JOIN companies c ON c.id = u.company_id
         WHERE u.id = ? AND u.is_deleted = 0`,
        [uid]
      );
      if (users.length > 0) {
        const withPerms = await attachRbacPermissions(users[0]);
        return res.json({ success: true, data: withPerms });
      }
    } catch (dbErr) {
      console.warn('getCurrentUser DB lookup failed:', dbErr.message);
    }

    if (BYPASS_USERS_DATA[uid]) {
      return res.json({ success: true, data: BYPASS_USERS_DATA[uid] });
    }

    return res.status(404).json({ success: false, error: req.t ? req.t('api_msg_b846d114') : "User not found" });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, error: req.t ? req.t('api_msg_d7c8c85b') : "Failed" });
  }
};

const logout = async (req, res) => res.json({ success: true });

const updateCurrentUser = async (req, res) => res.status(501).json({ success: false, error: req.t ? req.t('api_msg_72ba9b19') : "Not implemented in bypass mode" });

const changePassword = async (req, res) => res.status(501).json({ success: false, error: req.t ? req.t('api_msg_72ba9b19') : "Not implemented in bypass mode" });

module.exports = {
  login,
  logout,
  getCurrentUser,
  updateCurrentUser,
  changePassword
};
