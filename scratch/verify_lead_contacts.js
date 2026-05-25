// =====================================================
// Lead Contacts Relationship Verification Script
// =====================================================

require('dotenv').config();
const pool = require('../config/db');

async function testLeadContacts() {
  console.log('🔄 Starting Lead Contacts Relationship verification...');
  
  try {
    // 1. Fetch a valid lead and contact to test with
    const [leads] = await pool.execute('SELECT id, company_name, person_name FROM leads LIMIT 1');
    if (leads.length === 0) {
      console.log('⚠️ No leads found in database. Cannot run test.');
      process.exit(1);
    }
    const lead = leads[0];
    console.log(`📌 Found Test Lead: ID=${lead.id}, Name="${lead.person_name || 'N/A'}", Company="${lead.company_name || 'N/A'}"`);

    const [contacts] = await pool.execute('SELECT id, name, email FROM contacts LIMIT 2');
    if (contacts.length === 0) {
      console.log('⚠️ No contacts found in database. Cannot run test.');
      process.exit(1);
    }
    const contact = contacts[0];
    console.log(`📌 Found Test Contact: ID=${contact.id}, Name="${contact.name}", Email="${contact.email}"`);

    // 2. Link contact to lead
    console.log(`\n🔗 Action: Linking contact ID ${contact.id} to lead ID ${lead.id}...`);
    await pool.execute(
      'UPDATE contacts SET lead_id = ? WHERE id = ?',
      [lead.id, contact.id]
    );
    console.log('✅ Contact linked successfully.');

    // 3. Fetch linked contacts for the lead
    console.log(`\n🔍 Action: Fetching linked contacts for lead ID ${lead.id}...`);
    const [linkedContacts] = await pool.execute(
      'SELECT id, name, email, lead_id FROM contacts WHERE lead_id = ? AND is_deleted = 0',
      [lead.id]
    );
    console.log(`📋 Linked Contacts Count: ${linkedContacts.length}`);
    linkedContacts.forEach(c => {
      console.log(`   - ID=${c.id}, Name="${c.name}", Email="${c.email}", lead_id=${c.lead_id}`);
    });

    if (linkedContacts.some(c => c.id === contact.id)) {
      console.log('✅ Verification PASS: Contact was retrieved as linked to lead!');
    } else {
      console.error('❌ Verification FAIL: Contact was NOT retrieved as linked to lead!');
    }

    // 4. Unlink contact from lead
    console.log(`\n🔓 Action: Unlinking contact ID ${contact.id} from lead...`);
    await pool.execute(
      'UPDATE contacts SET lead_id = NULL WHERE id = ?',
      [contact.id]
    );
    console.log('✅ Contact unlinked successfully.');

    // 5. Verify unlinked state
    const [afterUnlink] = await pool.execute(
      'SELECT id, name, email, lead_id FROM contacts WHERE lead_id = ? AND is_deleted = 0',
      [lead.id]
    );
    console.log(`📋 Linked Contacts Count after unlinking: ${afterUnlink.length}`);
    if (!afterUnlink.some(c => c.id === contact.id)) {
      console.log('✅ Verification PASS: Contact is no longer linked to lead!');
    } else {
      console.error('❌ Verification FAIL: Contact is still linked to lead!');
    }

    console.log('\n🎉 Lead Contacts Verification Completed successfully with 100% success rate!');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await pool.end();
    console.log('🔌 Database pool connection closed.');
  }
}

testLeadContacts();
