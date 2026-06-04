const fs = require('fs');
const path = require('path');

function patchLocale(lang, key, value) {
  const filePath = path.join(__dirname, `../locales/${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  data[key] = value;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Patched ${lang}.json: [${key}] = "${value}"`);
}

patchLocale('en', 'api_msg_lead_already_converted', 'Lead already converted');
patchLocale('de', 'api_msg_lead_already_converted', 'Interessent bereits konvertiert');
process.exit(0);
