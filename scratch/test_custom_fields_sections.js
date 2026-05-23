require('dotenv').config();
const pool = require('../config/db');

async function runTests() {
  console.log('🧪 Starting Automated Tests for Custom Sections & Fields...');

  const companyId = 1;
  const moduleName = 'Leads';
  const sectionName = 'Test Address Info';
  const fieldLabel = 'Test Postal Code';
  const fieldName = 'test_postal_code';
  const fieldType = 'text';

  try {
    // 1. Create a Custom Section
    console.log(`\nStep 1: Creating custom section "${sectionName}"...`);
    const [sectionResult] = await pool.execute(
      `INSERT INTO custom_sections (company_id, module_name, section_name) VALUES (?, ?, ?)`,
      [companyId, moduleName, sectionName]
    );
    const sectionId = sectionResult.insertId;
    console.log(`✅ Custom section created with ID: ${sectionId}`);

    // 2. Create a Custom Field linked to the section
    console.log(`\nStep 2: Creating custom field "${fieldLabel}" linked to section ID ${sectionId}...`);
    const [fieldResult] = await pool.execute(
      `INSERT INTO custom_fields (company_id, section_id, name, label, type, module, required)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [companyId, sectionId, fieldName, fieldLabel, fieldType, moduleName, 0]
    );
    const fieldId = fieldResult.insertId;
    console.log(`✅ Custom field created with ID: ${fieldId}`);

    // 3. Verify linkage
    console.log(`\nStep 3: Verifying linkage...`);
    const [fieldRows] = await pool.execute(
      `SELECT * FROM custom_fields WHERE id = ?`,
      [fieldId]
    );
    if (fieldRows.length > 0 && fieldRows[0].section_id === sectionId) {
      console.log('✅ Linkage verification successful! Field is linked to the section.');
    } else {
      throw new Error(`Linkage verification failed. Expected section_id ${sectionId}, got ${fieldRows[0]?.section_id}`);
    }

    // 4. Delete the Section
    console.log(`\nStep 4: Deleting custom section ID ${sectionId}...`);
    await pool.execute(
      `DELETE FROM custom_sections WHERE id = ?`,
      [sectionId]
    );
    console.log('✅ Custom section deleted.');

    // 5. Verify cascade set null behavior
    console.log(`\nStep 5: Verifying field section_id was set to NULL on section delete...`);
    const [updatedFieldRows] = await pool.execute(
      `SELECT * FROM custom_fields WHERE id = ?`,
      [fieldId]
    );
    if (updatedFieldRows.length > 0 && updatedFieldRows[0].section_id === null) {
      console.log('✅ Cascade Set Null verification successful! Field section_id became NULL.');
    } else {
      throw new Error(`Cascade Set Null verification failed. Expected NULL, got ${updatedFieldRows[0]?.section_id}`);
    }

    // 6. Clean up the field
    console.log(`\nStep 6: Cleaning up test custom field...`);
    await pool.execute(
      `DELETE FROM custom_fields WHERE id = ?`,
      [fieldId]
    );
    console.log('✅ Cleanup completed.');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The Dynamic Custom Sections & Fields system works perfectly.');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
  } finally {
    process.exit(0);
  }
}

runTests();
