
const pool = require('./config/db');

const updateToDarkMode = async () => {
    try {
        console.log('🚀 Updating theme to dark mode in database...');

        // Check if theme_mode exists for company 1
        const [rows] = await pool.execute(
            'SELECT * FROM system_settings WHERE company_id = 1 AND setting_key = "theme_mode"'
        );

        if (rows.length > 0) {
            await pool.execute(
                'UPDATE system_settings SET setting_value = "dark" WHERE company_id = 1 AND setting_key = "theme_mode"'
            );
            console.log('✅ Updated existing theme_mode to "dark"');
        } else {
            await pool.execute(
                'INSERT INTO system_settings (company_id, setting_key, setting_value) VALUES (1, "theme_mode", "dark")'
            );
            console.log('✅ Inserted new theme_mode as "dark"');
        }

        console.log('🎉 Done!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating theme:', error.message);
        process.exit(1);
    }
};

updateToDarkMode();
