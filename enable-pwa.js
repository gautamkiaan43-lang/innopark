/**
 * Enable PWA Script
 * Run this to enable PWA in database
 */

require('dotenv').config();
const pool = require('./config/db');

async function enablePwa() {
    try {
        console.log('Enabling PWA...');

        await pool.execute(`
      UPDATE pwa_settings 
      SET enabled = 1, 
          app_name = 'Develo CRM',
          short_name = 'CRM',
          description = 'A powerful CRM solution for your business',
          theme_color = '#6366f1',
          background_color = '#ffffff',
          updated_at = NOW()
      WHERE id = 1
    `);

        const [rows] = await pool.execute('SELECT * FROM pwa_settings LIMIT 1');
        console.log('✅ PWA Enabled!');
        console.log('Settings:', rows[0]);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

enablePwa();
