const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '..', 'locales', 'en.json');
const dePath = path.join(__dirname, '..', 'locales', 'de.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const de = JSON.parse(fs.readFileSync(dePath, 'utf8'));

const results = [];
function checkBackend(enObj, deObj, currentPath = '') {
  for (const key in enObj) {
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    const enVal = enObj[key];
    const deVal = deObj ? deObj[key] : undefined;

    if (deVal === undefined) {
      results.push({ type: 'missing', path: newPath, en: enVal });
      continue;
    }

    if (typeof enVal === 'object' && enVal !== null) {
      checkBackend(enVal, deVal, newPath);
    } else {
      if (enVal === deVal && enVal.trim() !== '' && isNaN(enVal) && enVal !== '-' && enVal.length > 2) {
        // Let's filter out standard identical terms
        const common = ['email', 'details', 'id', 'net', 'gross', 'ip', 'sms', 'smtp', 'tls', 'ssl', 'pwa', 'api', 'vat', 'gst', 'url', 'cc', 'bcc', 'paypal', 'stripe', 'upi', 'system', 'done', 'whatsapp', 'slack', 'twitter', 'excel'];
        if (!common.includes(enVal.toLowerCase())) {
          results.push({ type: 'same', path: newPath, en: enVal, de: deVal });
        }
      }
    }
  }
}
checkBackend(en, de);
console.log(JSON.stringify(results, null, 2));
