/**
 * Settings Controller
 * Enhanced with validation, service layer, and proper error handling
 */

const settingsService = require('../services/settingsService');
const { validateSetting, validateSettings } = require('../utils/settingsValidator');

/**
 * Get all settings
 * GET /api/v1/settings
 */
const get = async (req, res) => {
  try {
    const companyId = req.query.company_id || req.user?.company_id || null;
    const settings = await settingsService.getAllSettings(companyId);

    res.json({
      success: true,
      data: settings,
      count: settings.length
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch settings'
    });
  }
};

/**
 * Get settings by category
 * GET /api/v1/settings/category/:category
 */
const getByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const companyId = req.query.company_id || req.user?.company_id || null;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_b7e25993') : "Category is required"
      });
    }

    const settings = await settingsService.getSettingsByCategory(category, companyId);

    res.json({
      success: true,
      data: settings,
      category,
      count: settings.length
    });
  } catch (error) {
    console.error('Get settings by category error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch settings'
    });
  }
};

/**
 * Get a single setting
 * GET /api/v1/settings/:key
 */
const getSingle = async (req, res) => {
  try {
    const { key } = req.params;
    const companyId = req.query.company_id || req.user?.company_id || null;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_8dd60c81') : "Setting key is required"
      });
    }

    const value = await settingsService.getSetting(key, companyId);

    res.json({
      success: true,
      data: {
        setting_key: key,
        setting_value: value
      }
    });
  } catch (error) {
    console.error('Get single setting error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch setting'
    });
  }
};

/**
 * Update a single setting
 * PUT /api/v1/settings
 */
const update = async (req, res) => {
  try {
    let setting_key, setting_value;
    const companyId = req.query.company_id || req.user?.company_id || 1;

    // Handle file upload (multipart/form-data)
    if (req.file) {
      setting_key = req.body.setting_key || 'company_logo';
      setting_value = `/uploads/${req.file.filename}`;
    } else {
      setting_key = req.body.setting_key;
      setting_value = req.body.setting_value;
    }

    // Validate required fields
    if (!setting_key) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_dad0a78e') : "setting_key is required"
      });
    }

    // Validate setting
    const validation = validateSetting(setting_key, setting_value);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_d10fb60c') : "Validation failed",
        errors: validation.errors
      });
    }

    // Update setting
    const result = await settingsService.updateSetting(setting_key, setting_value, companyId);

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_d86fce85') : "Setting updated successfully",
      data: result
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update setting',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Bulk update settings
 * PUT /api/v1/settings/bulk
 */
const bulkUpdate = async (req, res) => {
  try {
    const { settings } = req.body;
    const companyId = req.query.company_id || req.user?.company_id || 1;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_b4af831b') : "Settings must be an array"
      });
    }

    if (settings.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_b3083c35') : "At least one setting is required"
      });
    }

    // Validate all settings
    const validation = validateSettings(settings);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_d10fb60c') : "Validation failed",
        errors: validation.errors
      });
    }

    // Bulk update settings
    const results = await settingsService.bulkUpdateSettings(settings, companyId);

    res.json({
      success: true,
      message: `${results.length} settings updated successfully`,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Bulk update settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update settings',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Delete a setting
 * DELETE /api/v1/settings/:key
 */
const deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const companyId = req.query.company_id || req.user?.company_id || 1;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_8dd60c81') : "Setting key is required"
      });
    }

    await settingsService.deleteSetting(key, companyId);

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_5cce1e40') : "Setting deleted successfully"
    });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete setting'
    });
  }
};

/**
 * Initialize default settings
 * POST /api/v1/settings/initialize
 */
const initialize = async (req, res) => {
  try {
    const companyId = req.query.company_id || req.user?.company_id || 1;

    const result = await settingsService.initializeDefaultSettings(companyId);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Initialize settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initialize settings'
    });
  }
};

/**
 * Reset all settings to default
 * POST /api/v1/settings/reset
 */
const reset = async (req, res) => {
  try {
    const companyId = req.query.company_id || req.user?.company_id || 1;

    // Delete all existing settings for this company
    await settingsService.deleteSetting('%', companyId);

    // Initialize with defaults
    const result = await settingsService.initializeDefaultSettings(companyId);

    res.json({
      success: true,
      message: req.t ? req.t('api_msg_3b7c753a') : "Settings reset to default successfully",
      data: result
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset settings'
    });
  }
};

/**
 * Export settings
 * GET /api/v1/settings/export
 */
const exportSettings = async (req, res) => {
  try {
    const companyId = req.query.company_id || req.user?.company_id || 1;
    const settings = await settingsService.getAllSettings(companyId);

    // Convert to key-value pairs
    const exportData = {};
    settings.forEach(setting => {
      try {
        // Try to parse JSON values
        if (setting.setting_value && (setting.setting_value.startsWith('{') || setting.setting_value.startsWith('['))) {
          exportData[setting.setting_key] = JSON.parse(setting.setting_value);
        } else {
          exportData[setting.setting_key] = setting.setting_value;
        }
      } catch (e) {
        exportData[setting.setting_key] = setting.setting_value;
      }
    });

    res.json({
      success: true,
      data: exportData,
      count: Object.keys(exportData).length,
      exported_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Export settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export settings'
    });
  }
};

/**
 * Import settings
 * POST /api/v1/settings/import
 */
const importSettings = async (req, res) => {
  try {
    const { settings: importData } = req.body;
    const companyId = req.query.company_id || req.user?.company_id || 1;

    if (!importData || typeof importData !== 'object') {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('api_msg_2112d4ae') : "Settings data must be an object"
      });
    }

    // Convert object to array format
    const settingsArray = Object.keys(importData).map(key => ({
      setting_key: key,
      setting_value: importData[key]
    }));

    // Bulk update
    const results = await settingsService.bulkUpdateSettings(settingsArray, companyId);

    res.json({
      success: true,
      message: `${results.length} settings imported successfully`,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Import settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to import settings'
    });
  }
};

module.exports = {
  get,
  getByCategory,
  getSingle,
  update,
  bulkUpdate,
  deleteSetting,
  initialize,
  reset,
  exportSettings,
  importSettings
};

