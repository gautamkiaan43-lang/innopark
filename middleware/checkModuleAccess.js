/**
 * Module Access Control Middleware
 * Checks if a module is enabled before allowing access
 */

const settingsService = require('../services/settingsService');

/**
 * Cache for module settings to avoid database queries on every request
 */
const moduleCache = new Map();
const CACHE_TTL = 60000; // 1 minute

/**
 * Get module status from cache or database
 */
const getModuleStatus = async (moduleName, companyId) => {
  const cacheKey = `${companyId}_module_${moduleName}`;
  const cached = moduleCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  try {
    const value = await settingsService.getSetting(`module_${moduleName}`, companyId);
    const isEnabled = value === 'true' || value === true || value === '1' || value === 1;

    // Cache the result
    moduleCache.set(cacheKey, {
      value: isEnabled,
      timestamp: Date.now()
    });

    return isEnabled;
  } catch (error) {
    console.error(`Error checking module status for ${moduleName}:`, error);
    // Default to enabled if there's an error
    return true;
  }
};

/**
 * Clear module cache for a company
 */
const clearModuleCache = (companyId) => {
  const keys = Array.from(moduleCache.keys());
  keys.forEach(key => {
    if (key.startsWith(`${companyId}_module_`)) {
      moduleCache.delete(key);
    }
  });
};

/**
 * Middleware to check if a module is enabled
 */
const checkModuleAccess = (moduleName) => {
  return async (req, res, next) => {
    try {
      const companyId = req.user?.company_id || req.query.company_id || 1;

      const isEnabled = await getModuleStatus(moduleName, companyId);

      if (!isEnabled) {
        return res.status(403).json({
          success: false,
          error: `Module '${moduleName}' is disabled`,
          message: `The ${moduleName} module is currently disabled. Please contact your administrator to enable it.`
        });
      }

      next();
    } catch (error) {
      console.error('Module access check error:', error);
      // Allow access if there's an error checking
      next();
    }
  };
};

/**
 * Middleware to check multiple modules (OR logic)
 * User needs access to at least one of the modules
 */
const checkAnyModuleAccess = (moduleNames) => {
  return async (req, res, next) => {
    try {
      const companyId = req.user?.company_id || req.query.company_id || 1;

      const moduleStatuses = await Promise.all(
        moduleNames.map(name => getModuleStatus(name, companyId))
      );

      const hasAccess = moduleStatuses.some(status => status === true);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'No module access',
          message: `You need access to at least one of these modules: ${moduleNames.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Module access check error:', error);
      next();
    }
  };
};

/**
 * Middleware to check all modules (AND logic)
 * User needs access to all modules
 */
const checkAllModulesAccess = (moduleNames) => {
  return async (req, res, next) => {
    try {
      const companyId = req.user?.company_id || req.query.company_id || 1;

      const moduleStatuses = await Promise.all(
        moduleNames.map(name => getModuleStatus(name, companyId))
      );

      const hasAccess = moduleStatuses.every(status => status === true);

      if (!hasAccess) {
        const disabledModules = moduleNames.filter((name, index) => !moduleStatuses[index]);
        return res.status(403).json({
          success: false,
          error: 'Insufficient module access',
          message: `The following modules are disabled: ${disabledModules.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Module access check error:', error);
      next();
    }
  };
};

module.exports = {
  checkModuleAccess,
  checkAnyModuleAccess,
  checkAllModulesAccess,
  clearModuleCache,
  getModuleStatus
};
