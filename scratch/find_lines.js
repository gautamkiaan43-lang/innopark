const fs = require('fs');
const lines = fs.readFileSync('controllers/leadController.js', 'utf8').split('\n');

lines.forEach((line, i) => {
  if (line.includes('sanitizeLead')) {
    console.log(`Line ${i + 1}: ${line}`);
  }
});
