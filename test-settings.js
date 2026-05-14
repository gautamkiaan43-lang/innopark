/**
 * Settings System Test Script
 * Tests all settings API endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1/settings';
const COMPANY_ID = 1;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`)
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to run test
async function runTest(name, testFn) {
  try {
    log.info(`Testing: ${name}`);
    await testFn();
    log.success(`PASS: ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    return true;
  } catch (error) {
    log.error(`FAIL: ${name}`);
    console.error(`  Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 1: Initialize Default Settings
async function testInitialize() {
  const response = await axios.post(`${BASE_URL}/initialize?company_id=${COMPANY_ID}`);
  if (!response.data.success) {
    throw new Error('Failed to initialize settings');
  }
  if (!response.data.message.includes('initialized')) {
    throw new Error('Unexpected response message');
  }
}

// Test 2: Get All Settings
async function testGetAll() {
  const response = await axios.get(`${BASE_URL}?company_id=${COMPANY_ID}`);
  if (!response.data.success) {
    throw new Error('Failed to get settings');
  }
  if (!Array.isArray(response.data.data)) {
    throw new Error('Response data is not an array');
  }
  if (response.data.data.length === 0) {
    throw new Error('No settings found');
  }
  log.info(`  Found ${response.data.count} settings`);
}

// Test 3: Update Single Setting
async function testUpdateSingle() {
  const response = await axios.put(`${BASE_URL}?company_id=${COMPANY_ID}`, {
    setting_key: 'company_name',
    setting_value: 'Test Company'
  });
  if (!response.data.success) {
    throw new Error('Failed to update setting');
  }
  if (response.data.data.setting_key !== 'company_name') {
    throw new Error('Setting key mismatch');
  }
}

// Test 4: Bulk Update Settings
async function testBulkUpdate() {
  const response = await axios.put(`${BASE_URL}/bulk?company_id=${COMPANY_ID}`, {
    settings: [
      { setting_key: 'theme_mode', setting_value: 'dark' },
      { setting_key: 'primary_color', setting_value: '#FF5733' },
      { setting_key: 'company_email', setting_value: 'test@example.com' }
    ]
  });
  if (!response.data.success) {
    throw new Error('Failed to bulk update');
  }
  if (response.data.count !== 3) {
    throw new Error(`Expected 3 settings updated, got ${response.data.count}`);
  }
}

// Test 5: Get Settings by Category
async function testGetByCategory() {
  const response = await axios.get(`${BASE_URL}/category/module?company_id=${COMPANY_ID}`);
  if (!response.data.success) {
    throw new Error('Failed to get category settings');
  }
  if (!Array.isArray(response.data.data)) {
    throw new Error('Response data is not an array');
  }
  log.info(`  Found ${response.data.count} module settings`);
}

// Test 6: Get Single Setting
async function testGetSingle() {
  const response = await axios.get(`${BASE_URL}/company_name?company_id=${COMPANY_ID}`);
  if (!response.data.success) {
    throw new Error('Failed to get single setting');
  }
  if (response.data.data.setting_key !== 'company_name') {
    throw new Error('Setting key mismatch');
  }
}

// Test 7: Export Settings
async function testExport() {
  const response = await axios.get(`${BASE_URL}/export?company_id=${COMPANY_ID}`);
  if (!response.data.success) {
    throw new Error('Failed to export settings');
  }
  if (typeof response.data.data !== 'object') {
    throw new Error('Export data is not an object');
  }
  log.info(`  Exported ${response.data.count} settings`);
}

// Test 8: Import Settings
async function testImport() {
  const response = await axios.post(`${BASE_URL}/import?company_id=${COMPANY_ID}`, {
    settings: {
      company_name: 'Imported Company',
      system_name: 'Test CRM'
    }
  });
  if (!response.data.success) {
    throw new Error('Failed to import settings');
  }
  if (response.data.count !== 2) {
    throw new Error(`Expected 2 settings imported, got ${response.data.count}`);
  }
}

// Test 9: Validation - Invalid Email
async function testValidationEmail() {
  try {
    await axios.put(`${BASE_URL}?company_id=${COMPANY_ID}`, {
      setting_key: 'company_email',
      setting_value: 'invalid-email'
    });
    throw new Error('Should have failed validation');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      // Expected error
      return;
    }
    throw error;
  }
}

// Test 10: Validation - Invalid Color
async function testValidationColor() {
  try {
    await axios.put(`${BASE_URL}?company_id=${COMPANY_ID}`, {
      setting_key: 'primary_color',
      setting_value: 'red'
    });
    throw new Error('Should have failed validation');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      // Expected error
      return;
    }
    throw error;
  }
}

// Test 11: Validation - Invalid Enum
async function testValidationEnum() {
  try {
    await axios.put(`${BASE_URL}?company_id=${COMPANY_ID}`, {
      setting_key: 'theme_mode',
      setting_value: 'purple'
    });
    throw new Error('Should have failed validation');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      // Expected error
      return;
    }
    throw error;
  }
}

// Test 12: Reset Settings
async function testReset() {
  const response = await axios.post(`${BASE_URL}/reset?company_id=${COMPANY_ID}`);
  if (!response.data.success) {
    throw new Error('Failed to reset settings');
  }
}

// Test 13: Module Access - Disable Module
async function testDisableModule() {
  const response = await axios.put(`${BASE_URL}?company_id=${COMPANY_ID}`, {
    setting_key: 'module_leads',
    setting_value: 'false'
  });
  if (!response.data.success) {
    throw new Error('Failed to disable module');
  }
}

// Test 14: Module Access - Enable Module
async function testEnableModule() {
  const response = await axios.put(`${BASE_URL}?company_id=${COMPANY_ID}`, {
    setting_key: 'module_leads',
    setting_value: 'true'
  });
  if (!response.data.success) {
    throw new Error('Failed to enable module');
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n========================================');
  console.log('    SETTINGS SYSTEM TEST SUITE');
  console.log('========================================\n');

  log.info(`Testing against: ${BASE_URL}`);
  log.info(`Company ID: ${COMPANY_ID}\n`);

  // Run all tests
  await runTest('Initialize Default Settings', testInitialize);
  await runTest('Get All Settings', testGetAll);
  await runTest('Update Single Setting', testUpdateSingle);
  await runTest('Bulk Update Settings', testBulkUpdate);
  await runTest('Get Settings by Category', testGetByCategory);
  await runTest('Get Single Setting', testGetSingle);
  await runTest('Export Settings', testExport);
  await runTest('Import Settings', testImport);
  await runTest('Validation - Invalid Email', testValidationEmail);
  await runTest('Validation - Invalid Color', testValidationColor);
  await runTest('Validation - Invalid Enum', testValidationEnum);
  await runTest('Reset Settings', testReset);
  await runTest('Disable Module', testDisableModule);
  await runTest('Enable Module', testEnableModule);

  // Print results
  console.log('\n========================================');
  console.log('           TEST RESULTS');
  console.log('========================================\n');

  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Total: ${results.passed + results.failed}\n`);

  if (results.failed === 0) {
    log.success('ALL TESTS PASSED! 🎉');
  } else {
    log.error('SOME TESTS FAILED! ⚠️');
    console.log('\nFailed Tests:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  }

  console.log('\n========================================\n');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log.error('Test suite failed to run');
  console.error(error);
  process.exit(1);
});
