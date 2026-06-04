const fs = require('fs');
const path = require('path');

const dePath = path.join(__dirname, '..', 'locales', 'de.json');
const de = JSON.parse(fs.readFileSync(dePath, 'utf8'));

console.log("=== BACKEND DE.JSON UNDERSCORE VALUES ===");
function findUnderscores(obj, currentPath = '') {
  for (const key in obj) {
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      findUnderscores(value, newPath);
    } else if (typeof value === 'string' && value.includes('_')) {
      if (!value.startsWith('/') && !value.includes('@') && !value.startsWith('.') && !value.includes(' ') && !value.includes('-')) {
        console.log(`${newPath}: "${value}"`);
      }
    }
  }
}
findUnderscores(de);
