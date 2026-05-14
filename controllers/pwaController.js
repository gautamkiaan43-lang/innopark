// =====================================================
// PWA Controller
// Progressive Web App Settings Management
// =====================================================

const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

/**
 * Ensure pwa_settings table exists
 */
const ensureTableExists = async () => {
    try {
        // Check if table exists
        const [tables] = await pool.execute(
            "SHOW TABLES LIKE 'pwa_settings'"
        );
        
        if (tables.length === 0) {
            // Create table if it doesn't exist
            await pool.execute(`
                CREATE TABLE pwa_settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    enabled TINYINT(1) DEFAULT 0,
                    app_name VARCHAR(100) DEFAULT 'Develo CRM',
                    short_name VARCHAR(50) DEFAULT 'CRM',
                    description TEXT,
                    theme_color VARCHAR(20) DEFAULT '#6366f1',
                    background_color VARCHAR(20) DEFAULT '#ffffff',
                    icon_url VARCHAR(500),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            
            // Insert default row
            await pool.execute(`
                INSERT INTO pwa_settings (enabled, app_name, short_name, description, theme_color, background_color)
                VALUES (0, 'Develo CRM', 'CRM', 'A powerful CRM solution for your business', '#6366f1', '#ffffff')
            `);
        } else {
            // Table exists, check if 'enabled' column exists and add it if missing
            const [columns] = await pool.execute(
                "SHOW COLUMNS FROM pwa_settings LIKE 'enabled'"
            );
            
            if (columns.length === 0) {
                // Add 'enabled' column if it doesn't exist
                await pool.execute(`
                    ALTER TABLE pwa_settings 
                    ADD COLUMN enabled TINYINT(1) DEFAULT 0 AFTER id
                `);
            }
            
            // Check if table is empty and insert default row
            const [rows] = await pool.execute('SELECT COUNT(*) as count FROM pwa_settings');
            if (rows[0].count === 0) {
                await pool.execute(`
                    INSERT INTO pwa_settings (enabled, app_name, short_name, description, theme_color, background_color)
                    VALUES (0, 'Develo CRM', 'CRM', 'A powerful CRM solution for your business', '#6366f1', '#ffffff')
                `);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error ensuring pwa_settings table exists:', error);
        return false;
    }
};

/**
 * Get PWA Settings (Public - No Auth Required)
 * GET /api/v1/settings/pwa
 */
const getPwaSettings = async (req, res) => {
    try {
        // Ensure table exists first
        await ensureTableExists();
        
        // Check if table exists and get settings
        const [rows] = await pool.execute(
            'SELECT * FROM pwa_settings LIMIT 1'
        );

        if (rows.length === 0) {
            // Return default settings if no record exists
            return res.json({
                success: true,
                data: {
                    enabled: false,
                    app_name: 'Develo CRM',
                    short_name: 'CRM',
                    description: 'A powerful CRM solution for your business',
                    theme_color: '#6366f1',
                    background_color: '#ffffff',
                    icon_url: null
                }
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Get PWA settings error:', error);

        // If table doesn't exist, return defaults
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.json({
                success: true,
                data: {
                    enabled: false,
                    app_name: 'Develo CRM',
                    short_name: 'CRM',
                    description: 'A powerful CRM solution for your business',
                    theme_color: '#6366f1',
                    background_color: '#ffffff',
                    icon_url: null
                }
            });
        }

        res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_2592cbfa') : "Failed to fetch PWA settings"
        });
    }
};

/**
 * Update PWA Settings (Super Admin Only)
 * PUT /api/v1/settings/pwa
 */
const updatePwaSettings = async (req, res) => {
    try {
        // Ensure table exists first
        await ensureTableExists();
        
        const {
            enabled,
            app_name,
            short_name,
            description,
            theme_color,
            background_color
        } = req.body;

        // Validation
        const errors = [];

        // Validate app_name
        if (app_name !== undefined && (!app_name || app_name.trim() === '')) {
            errors.push('App name cannot be empty');
        }

        // Validate short_name
        if (short_name !== undefined && (!short_name || short_name.trim() === '')) {
            errors.push('Short name cannot be empty');
        }

        // Validate short_name length (PWA spec recommends max 12 characters)
        if (short_name && short_name.length > 50) {
            errors.push('Short name must be 50 characters or less');
        }

        // Validate theme_color (must be valid HEX)
        if (theme_color !== undefined) {
            const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (!hexColorRegex.test(theme_color)) {
                errors.push('Theme color must be a valid HEX color (e.g., #6366f1)');
            }
        }

        // Validate background_color (must be valid HEX)
        if (background_color !== undefined) {
            const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (!hexColorRegex.test(background_color)) {
                errors.push('Background color must be a valid HEX color (e.g., #ffffff)');
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: errors.join(', ')
            });
        }

        // Handle icon upload if present
        let icon_url = undefined;
        if (req.file) {
            // Validate icon dimensions (should be 192x192)
            icon_url = `/uploads/pwa/${req.file.filename}`;
        }

        // Check if record exists
        const [existing] = await pool.execute('SELECT id FROM pwa_settings LIMIT 1');

        if (existing.length === 0) {
            // Insert new record
            const insertFields = [];
            const insertValues = [];
            const placeholders = [];

            if (enabled !== undefined) {
                insertFields.push('enabled');
                insertValues.push(enabled ? 1 : 0);
                placeholders.push('?');
            }
            if (app_name !== undefined) {
                insertFields.push('app_name');
                insertValues.push(app_name.trim());
                placeholders.push('?');
            }
            if (short_name !== undefined) {
                insertFields.push('short_name');
                insertValues.push(short_name.trim());
                placeholders.push('?');
            }
            if (description !== undefined) {
                insertFields.push('description');
                insertValues.push(description ? description.trim() : '');
                placeholders.push('?');
            }
            if (theme_color !== undefined) {
                insertFields.push('theme_color');
                insertValues.push(theme_color);
                placeholders.push('?');
            }
            if (background_color !== undefined) {
                insertFields.push('background_color');
                insertValues.push(background_color);
                placeholders.push('?');
            }
            if (icon_url !== undefined) {
                insertFields.push('icon_url');
                insertValues.push(icon_url);
                placeholders.push('?');
            }

            if (insertFields.length > 0) {
                await pool.execute(
                    `INSERT INTO pwa_settings (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')})`,
                    insertValues
                );
            }
        } else {
            // Update existing record
            const updateFields = [];
            const updateValues = [];

            if (enabled !== undefined) {
                updateFields.push('enabled = ?');
                updateValues.push(enabled ? 1 : 0);
            }
            if (app_name !== undefined) {
                updateFields.push('app_name = ?');
                updateValues.push(app_name.trim());
            }
            if (short_name !== undefined) {
                updateFields.push('short_name = ?');
                updateValues.push(short_name.trim());
            }
            if (description !== undefined) {
                updateFields.push('description = ?');
                updateValues.push(description ? description.trim() : '');
            }
            if (theme_color !== undefined) {
                updateFields.push('theme_color = ?');
                updateValues.push(theme_color);
            }
            if (background_color !== undefined) {
                updateFields.push('background_color = ?');
                updateValues.push(background_color);
            }
            if (icon_url !== undefined) {
                updateFields.push('icon_url = ?');
                updateValues.push(icon_url);
            }

            if (updateFields.length > 0) {
                updateFields.push('updated_at = NOW()');
                updateValues.push(existing[0].id);

                await pool.execute(
                    `UPDATE pwa_settings SET ${updateFields.join(', ')} WHERE id = ?`,
                    updateValues
                );
            }
        }

        // Fetch and return updated settings
        const [updated] = await pool.execute('SELECT * FROM pwa_settings LIMIT 1');

        res.json({
            success: true,
            data: updated[0],
            message: req.t ? req.t('api_msg_d4ebf50a') : "PWA settings updated successfully"
        });
    } catch (error) {
        console.error('Update PWA settings error:', error);
        res.status(500).json({
            success: false,
            error: req.t ? req.t('api_msg_fa6f6278') : "Failed to update PWA settings"
        });
    }
};

/**
 * Generate Dynamic Manifest
 * GET /api/v1/settings/pwa/manifest
 */
const getManifest = async (req, res) => {
    try {
        // Ensure table exists first
        await ensureTableExists();
        
        const [rows] = await pool.execute('SELECT * FROM pwa_settings LIMIT 1');

        const settings = rows[0] || {
            app_name: 'Develo CRM',
            short_name: 'CRM',
            description: 'A powerful CRM solution for your business',
            theme_color: '#6366f1',
            background_color: '#ffffff',
            icon_url: null
        };

        // Build manifest object
        const manifest = {
            name: settings.app_name || 'Develo CRM',
            short_name: settings.short_name || 'CRM',
            description: settings.description || 'A powerful CRM solution',
            start_url: '/',
            display: 'standalone',
            orientation: 'portrait-primary',
            theme_color: settings.theme_color || '#6366f1',
            background_color: settings.background_color || '#ffffff',
            icons: []
        };

        // Add icons if available
        if (settings.icon_url) {
            const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
            manifest.icons = [
                {
                    src: settings.icon_url.startsWith('http') ? settings.icon_url : `${baseUrl}${settings.icon_url}`,
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any maskable'
                },
                {
                    src: settings.icon_url.startsWith('http') ? settings.icon_url : `${baseUrl}${settings.icon_url}`,
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any maskable'
                }
            ];
        } else {
            // Default icons placeholder
            manifest.icons = [
                {
                    src: '/icons/icon-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any maskable'
                },
                {
                    src: '/icons/icon-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any maskable'
                }
            ];
        }

        // Set proper content type for manifest
        res.setHeader('Content-Type', 'application/manifest+json');
        res.json(manifest);
    } catch (error) {
        console.error('Generate manifest error:', error);

        // Return default manifest on error
        res.setHeader('Content-Type', 'application/manifest+json');
        res.json({
            name: 'Develo CRM',
            short_name: 'CRM',
            description: 'A powerful CRM solution',
            start_url: '/',
            display: 'standalone',
            theme_color: '#6366f1',
            background_color: '#ffffff',
            icons: [
                {
                    src: '/icons/icon-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any maskable'
                }
            ]
        });
    }
};

module.exports = {
    getPwaSettings,
    updatePwaSettings,
    getManifest
};
