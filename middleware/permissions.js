// =====================================================
// Permission Middleware
// Checks if user has required permissions for a module
// =====================================================

const pool = require('../config/db');

/**
 * Map HTTP methods to permission types
 */
const METHOD_TO_PERMISSION = {
  'GET': 'can_view',
  'POST': 'can_add',
  'PUT': 'can_edit',
  'PATCH': 'can_edit',
  'DELETE': 'can_delete'
};

/**
 * Map route paths to module names
 */
const getModuleFromPath = (path, method) => {
  // Extract module name from path
  // Examples: /api/v1/proposals -> proposals, /api/v1/invoices/123 -> invoices
  const pathParts = path.split('/').filter(p => p);

  // Find the module name (usually after /api/v1/)
  const apiIndex = pathParts.indexOf('api');
  if (apiIndex !== -1 && pathParts[apiIndex + 1] === 'v1') {
    const moduleIndex = apiIndex + 2;
    if (pathParts[moduleIndex]) {
      return pathParts[moduleIndex].toLowerCase();
    }
  }

  // Fallback: try to extract from path
  const moduleMatch = path.match(/\/api\/v1\/([^\/]+)/);
  if (moduleMatch) {
    return moduleMatch[1].toLowerCase();
  }

  return null;
};

/**
 * Map API module name to module_settings key
 * Examples: 'tasks' -> 'myTasks' (for employee), 'tasks' -> 'tasks' (for client)
 */
const mapModuleNameToKey = (moduleName, userRole) => {
  // Module name mapping
  const moduleMap = {
    'tasks': 'myTasks',
    'projects': 'myProjects',
    'time_tracking': 'timeTracking',
    'time-tracking': 'timeTracking',
    'leaves': 'leaveRequests',
    'leave': 'leaveRequests',
    'employees': 'myProfile',
    'employee': 'myProfile',
    'documents': 'documents',
    'files': 'files',
    'events': 'events',
    'messages': 'messages',
    'tickets': 'tickets',
    'attendance': 'attendance',
    'proposals': 'proposals',
    'invoices': 'invoices',
    'payments': 'payments',
    'orders': 'orders',
    'notes': 'notes',
    'contracts': 'contracts',
    'dashboard': 'dashboard',
    'store': 'store',
    'billing': 'billing',
    'subscriptions': 'subscriptions',
  };

  return moduleMap[moduleName] || moduleName;
};

/**
 * Check if user has permission for a module
 * @param {string} permissionType - 'can_view', 'can_add', 'can_edit', 'can_delete'
 * @param {string} module - Module name (e.g., 'proposals', 'invoices')
 */
const checkPermission = (permissionType, module) => {
  return async (req, res, next) => {
    try {
      // Skip permission check for SUPERADMIN
      if (req.user && req.user.role === 'SUPERADMIN') {
        return next();
      }

      // Skip permission check for ADMIN (can be changed if needed)
      if (req.user && req.user.role === 'ADMIN') {
        return next();
      }

      // If no user, deny access
      if (!req.user || !req.userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get module name from path if not provided
      const moduleName = module || getModuleFromPath(req.path, req.method);

      if (!moduleName) {
        // If we can't determine module, allow access (for backward compatibility)
        return next();
      }

      // Get user's role
      const userRole = req.user.role;
      if (!userRole) {
        return res.status(403).json({
          success: false,
          error: 'User role not found'
        });
      }

      // Get company_id
      const companyId = req.companyId || req.query.company_id || req.body.company_id || req.user?.company_id || 1;

      // First check if module is enabled in module_settings
      const [moduleSettings] = await pool.execute(
        'SELECT employee_menus, module_permissions FROM module_settings WHERE company_id = ?',
        [companyId]
      );

      if (moduleSettings.length > 0) {
        const settings = moduleSettings[0];
        let clientMenus = {};
        let employeeMenus = {};
        let modulePerms = {};

        try {

          if (settings.employee_menus) {
            employeeMenus = typeof settings.employee_menus === 'string'
              ? JSON.parse(settings.employee_menus)
              : settings.employee_menus;
          }
          if (settings.module_permissions) {
            modulePerms = typeof settings.module_permissions === 'string'
              ? JSON.parse(settings.module_permissions)
              : settings.module_permissions;
          }
        } catch (e) {
          console.error('Error parsing module settings:', e);
        }

        // Map module name (e.g., 'tasks' -> 'myTasks' for employee)
        const moduleKey = mapModuleNameToKey(moduleName, userRole);

        // Check if module is enabled
        const isModuleEnabled = employeeMenus[moduleKey] !== false;

        if (!isModuleEnabled) {
          return res.status(403).json({
            success: false,
            error: `Module '${moduleName}' is disabled`
          });
        }

        const rbacRoleId = req.user?.rbac_role_id;
        if (userRole === 'EMPLOYEE' && rbacRoleId) {
          const mAlt = moduleName.replace(/-/g, '_');
          const [rpRows] = await pool.execute(
            `SELECT can_view, can_add, can_edit, can_delete FROM role_permissions
             WHERE role_id = ? AND (module = ? OR module = ?) LIMIT 1`,
            [rbacRoleId, moduleName, mAlt]
          );
          if (rpRows.length === 0) {
            return res.status(403).json({
              success: false,
              error: `Access denied for module '${moduleName}'`
            });
          }
          const ok = rpRows[0][permissionType] === 1 || rpRows[0][permissionType] === true;
          if (!ok) {
            return res.status(403).json({
              success: false,
              error: `Access denied for ${moduleName} (${permissionType})`
            });
          }
          return next();
        }

        // Check module_permissions if exists
        if (modulePerms[moduleKey]) {
          const modulePermission = modulePerms[moduleKey];
          const hasPermission = modulePermission[permissionType] === true || modulePermission[permissionType] === 1;

          if (!hasPermission) {
            return res.status(403).json({
              success: false,
              error: `Access denied. You don't have ${permissionType.replace('can_', '')} permission for ${moduleName}`
            });
          }
          // Permission granted from module_permissions
          return next();
        } else {
          // Module is enabled but no specific permissions set - default: allow (full access)
          return next();
        }
      } else {
        const rbacRoleId = req.user?.rbac_role_id;
        if (userRole === 'EMPLOYEE' && rbacRoleId) {
          const mAlt = moduleName.replace(/-/g, '_');
          const [rpRows] = await pool.execute(
            `SELECT can_view, can_add, can_edit, can_delete FROM role_permissions
             WHERE role_id = ? AND (module = ? OR module = ?) LIMIT 1`,
            [rbacRoleId, moduleName, mAlt]
          );
          if (rpRows.length === 0 || !(rpRows[0][permissionType] === 1 || rpRows[0][permissionType] === true)) {
            return res.status(403).json({
              success: false,
              error: `Access denied for module '${moduleName}'`
            });
          }
          return next();
        }
        return next();
      }

      // Fallback: Check permission in role_permissions table (for backward compatibility)
      // This is only reached if module_settings check didn't return (shouldn't happen)
      const [permissions] = await pool.execute(
        `SELECT ${permissionType} FROM role_permissions 
         WHERE role_id = ? AND module = ?`,
        [roleId, moduleName]
      );

      if (permissions.length === 0) {
        // No permission record found, deny access
        return res.status(403).json({
          success: false,
          error: `No ${permissionType} permission for module '${moduleName}'`
        });
      }

      const hasPermission = permissions[0][permissionType] === 1 || permissions[0][permissionType] === true;

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Access denied. You don't have ${permissionType.replace('can_', '')} permission for ${moduleName}`
        });
      }

      // Permission granted
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

/**
 * Middleware factory - automatically determines permission from HTTP method
 * @param {string} module - Optional module name, otherwise extracted from path
 */
const requirePermission = (module = null) => {
  return async (req, res, next) => {
    try {
      // Skip permission check for SUPERADMIN
      if (req.user && req.user.role === 'SUPERADMIN') {
        return next();
      }

      // Skip permission check for ADMIN (can be changed if needed)
      if (req.user && req.user.role === 'ADMIN') {
        return next();
      }

      // If no user, deny access
      if (!req.user || !req.userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get module name
      const moduleName = module || getModuleFromPath(req.path, req.method);

      if (!moduleName) {
        // If we can't determine module, allow access (for backward compatibility)
        return next();
      }

      // Get permission type from HTTP method
      const permissionType = METHOD_TO_PERMISSION[req.method] || 'can_view';

      // Get user's role
      const userRole = req.user.role;
      if (!userRole) {
        return res.status(403).json({
          success: false,
          error: 'User role not found'
        });
      }

      // Get role_id from roles table
      const companyId = req.companyId || req.query.company_id || req.body.company_id || req.user?.company_id || 1;

      // System roles (CLIENT, EMPLOYEE) don't need role_id lookup
      const systemRoles = ['SUPERADMIN', 'ADMIN', 'EMPLOYEE'];
      let roleId = null;

      if (!systemRoles.includes(userRole)) {
        const [roles] = await pool.execute(
          'SELECT id FROM roles WHERE role_name = ? AND company_id = ? AND is_deleted = 0',
          [userRole, companyId]
        );

        if (roles.length === 0) {
          return res.status(403).json({
            success: false,
            error: `Role '${userRole}' not found or no permissions configured`
          });
        }

        roleId = roles[0].id;
      }

      // First check if module is enabled in module_settings
      const [moduleSettings] = await pool.execute(
        'SELECT employee_menus, module_permissions FROM module_settings WHERE company_id = ?',
        [companyId]
      );

      if (moduleSettings.length > 0) {
        const settings = moduleSettings[0];
        let clientMenus = {};
        let employeeMenus = {};
        let modulePerms = {};

        try {

          if (settings.employee_menus) {
            employeeMenus = typeof settings.employee_menus === 'string'
              ? JSON.parse(settings.employee_menus)
              : settings.employee_menus;
          }
          if (settings.module_permissions) {
            modulePerms = typeof settings.module_permissions === 'string'
              ? JSON.parse(settings.module_permissions)
              : settings.module_permissions;
          }
        } catch (e) {
          console.error('Error parsing module settings:', e);
        }

        // Map module name (e.g., 'tasks' -> 'myTasks' for employee)
        const moduleKey = mapModuleNameToKey(moduleName, userRole);

        // Check if module is enabled
        const isModuleEnabled = employeeMenus[moduleKey] !== false;

        if (!isModuleEnabled) {
          return res.status(403).json({
            success: false,
            error: `Module '${moduleName}' is disabled`
          });
        }

        const rbacRoleId = req.user?.rbac_role_id;
        if (userRole === 'EMPLOYEE' && rbacRoleId) {
          const mAlt = moduleName.replace(/-/g, '_');
          const [rpRows] = await pool.execute(
            `SELECT can_view, can_add, can_edit, can_delete FROM role_permissions
             WHERE role_id = ? AND (module = ? OR module = ?) LIMIT 1`,
            [rbacRoleId, moduleName, mAlt]
          );
          if (rpRows.length === 0) {
            return res.status(403).json({
              success: false,
              error: `Access denied for module '${moduleName}'`
            });
          }
          const ok = rpRows[0][permissionType] === 1 || rpRows[0][permissionType] === true;
          if (!ok) {
            return res.status(403).json({
              success: false,
              error: `Access denied for ${moduleName} (${permissionType})`
            });
          }
          return next();
        }

        // Check module_permissions if exists
        if (modulePerms[moduleKey]) {
          const modulePermission = modulePerms[moduleKey];
          const hasPermission = modulePermission[permissionType] === true || modulePermission[permissionType] === 1;

          if (!hasPermission) {
            return res.status(403).json({
              success: false,
              error: `Access denied. You don't have ${permissionType.replace('can_', '')} permission for ${moduleName}`
            });
          }
          // Permission granted from module_permissions
          return next();
        } else {
          // Module is enabled but no specific permissions set - default: allow (full access)
          return next();
        }
      } else {
        const rbacRoleId = req.user?.rbac_role_id;
        if (userRole === 'EMPLOYEE' && rbacRoleId) {
          const mAlt = moduleName.replace(/-/g, '_');
          const [rpRows] = await pool.execute(
            `SELECT can_view, can_add, can_edit, can_delete FROM role_permissions
             WHERE role_id = ? AND (module = ? OR module = ?) LIMIT 1`,
            [rbacRoleId, moduleName, mAlt]
          );
          if (rpRows.length === 0 || !(rpRows[0][permissionType] === 1 || rpRows[0][permissionType] === true)) {
            return res.status(403).json({
              success: false,
              error: `Access denied for module '${moduleName}'`
            });
          }
          return next();
        }
        return next();
      }

      // Fallback: Check permission in role_permissions table (for backward compatibility)
      // This is only reached if module_settings check didn't return (shouldn't happen)
      const [permissions] = await pool.execute(
        `SELECT ${permissionType} FROM role_permissions 
         WHERE role_id = ? AND module = ?`,
        [roleId, moduleName]
      );

      if (permissions.length === 0) {
        return res.status(403).json({
          success: false,
          error: `No ${permissionType} permission for module '${moduleName}'`
        });
      }

      const hasPermission = permissions[0][permissionType] === 1 || permissions[0][permissionType] === true;

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Access denied. You don't have ${permissionType.replace('can_', '')} permission for ${moduleName}`
        });
      }

      // Permission granted
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

/**
 * Specific permission checkers
 */
const canView = (module) => checkPermission('can_view', module);
const canAdd = (module) => checkPermission('can_add', module);
const canEdit = (module) => checkPermission('can_edit', module);
const canDelete = (module) => checkPermission('can_delete', module);

module.exports = {
  requirePermission,
  canView,
  canAdd,
  canEdit,
  canDelete,
  checkPermission
};
