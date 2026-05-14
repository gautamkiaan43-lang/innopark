-- PWA Settings Table Migration
-- Creates pwa_settings table for Progressive Web App configuration

CREATE TABLE IF NOT EXISTS pwa_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enabled TINYINT(1) DEFAULT 0 COMMENT 'Whether PWA is enabled',
    app_name VARCHAR(255) DEFAULT 'Develo CRM' COMMENT 'Full app name for PWA',
    short_name VARCHAR(50) DEFAULT 'CRM' COMMENT 'Short name for home screen',
    description TEXT COMMENT 'App description for PWA manifest',
    theme_color VARCHAR(7) DEFAULT '#6366f1' COMMENT 'Theme color in HEX format',
    background_color VARCHAR(7) DEFAULT '#ffffff' COMMENT 'Background color for splash screen',
    icon_url VARCHAR(500) DEFAULT NULL COMMENT 'URL to PWA icon (192x192)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default PWA settings
INSERT INTO pwa_settings (enabled, app_name, short_name, description, theme_color, background_color)
VALUES (0, 'Develo CRM', 'CRM', 'A powerful CRM solution for your business', '#6366f1', '#ffffff')
ON DUPLICATE KEY UPDATE id=id;
