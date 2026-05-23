require('dotenv').config();
const migrationService = require('../services/migrationService');

async function run() {
  await migrationService.run();
  process.exit(0);
}

run();
