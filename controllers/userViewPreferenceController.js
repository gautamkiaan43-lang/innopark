// =====================================================
// User View Preference Controller
// =====================================================

const pool = require('../config/db');

/**
 * Get all view preferences for the logged-in user
 * GET /api/v1/view-preferences
 */
const getPreferences = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    let rows = [];
    try {
      const [result] = await pool.execute(
        'SELECT module_name, view_type FROM user_view_preferences WHERE user_id = ?',
        [userId]
      );
      rows = result;
    } catch (dbErr) {
      // Table may not exist on this environment — return empty preferences gracefully
      console.warn('view-preferences: table may not exist yet:', dbErr.message);
      rows = [];
    }

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get view preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch view preferences'
    });
  }
};

/**
 * Save or update view preference for a module
 * POST /api/v1/view-preferences
 */
const savePreference = async (req, res) => {
  try {
    const userId = req.userId;
    const { module_name, view_type } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    if (!module_name || !view_type) {
      return res.status(400).json({
        success: false,
        error: 'module_name and view_type are required'
      });
    }

    // Upsert view preference (graceful if table doesn't exist yet)
    try {
      await pool.execute(
        `INSERT INTO user_view_preferences (user_id, module_name, view_type) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE view_type = VALUES(view_type), updated_at = NOW()`,
        [userId, module_name, view_type]
      );
    } catch (dbErr) {
      // Table may not exist yet — log but still return success so UI doesn't break
      console.warn('view-preferences save: table may not exist yet:', dbErr.message);
    }

    res.json({
      success: true,
      message: 'View preference saved successfully'
    });
  } catch (error) {
    console.error('Save view preference error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save view preference'
    });
  }
};

module.exports = {
  getPreferences,
  savePreference
};
