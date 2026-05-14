const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');
const enPath = path.join(localesDir, 'en.json');
const dePath = path.join(localesDir, 'de.json');

let enDict = {};
let deDict = {};

try {
  if (fs.existsSync(enPath)) enDict = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  if (fs.existsSync(dePath)) deDict = JSON.parse(fs.readFileSync(dePath, 'utf8'));
} catch (err) {
  console.error("Failed to load backend translations:", err);
}

const i18nMiddleware = (req, res, next) => {
  // Default: German. Frontend sends X-Language from localStorage so API strings track UI language.
  let lang = 'de';
  const explicit = String(req.headers['x-language'] || req.headers['language'] || '').trim().toLowerCase();
  if (explicit === 'en' || explicit.startsWith('en')) {
    lang = 'en';
  } else if (explicit === 'de' || explicit.startsWith('de')) {
    lang = 'de';
  } else {
    const langHeader = req.headers['accept-language'] || '';
    if (langHeader.toLowerCase().includes('en')) {
      lang = 'en';
    } else if (langHeader.toLowerCase().includes('de')) {
      lang = 'de';
    }
  }

  req.language = lang;

  req.t = (key) => {
      if (lang === 'de') {
          return deDict[key] || enDict[key] || key;
      }
      return enDict[key] || deDict[key] || key;
  };

  next();
};

module.exports = i18nMiddleware;
