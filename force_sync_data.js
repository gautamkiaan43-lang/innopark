const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function cleanup() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        console.log('Cleaning up unread messages to set count to 1...');
        
        // Find all unread messages for Admin (1)
        const [unread] = await connection.execute(
            'SELECT id FROM messages WHERE to_user_id = 1 AND is_read = 0 ORDER BY created_at DESC'
        );
        
        console.log('Found ' + unread.length + ' unread messages for Admin.');
        
        if (unread.length > 1) {
            // Mark all but the newest one as read
            const idsToMark = unread.slice(1).map(m => m.id);
            await connection.query(
                'UPDATE messages SET is_read = 1, read_at = NOW() WHERE id IN (?)',
                [idsToMark]
            );
            console.log('Marked ' + idsToMark.length + ' messages as read.');
        }

        // Do the same for ANY user if they have many unreads?
        // No, let's just stick to Admin for now.
        
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
        process.exit();
    }
}
cleanup();
