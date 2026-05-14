const fs = require('fs');
const path = 'c:/Users/bhagy/OneDrive/Desktop/Kiaan technoligy/innopark/backend/controllers/messageController.js';
let content = fs.readFileSync(path, 'utf8');

// Fix getConversation WHERE clause
content = content.replace(
    /WHERE m\.company_id = \? \s+AND m\.is_deleted = 0/g,
    "WHERE (m.company_id = ? OR m.company_id IS NULL) \n            AND m.is_deleted = 0"
);

// Fix getAll subquery params if needed (already updated in previous turn)

fs.writeFileSync(path, content);
console.log('File updated successfully');
