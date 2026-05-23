require('dotenv').config();
const pool = require('../config/db');
const leadController = require('../controllers/leadController');

// Helper to mock Express response object
const mockResponse = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

// Main test function
async function runTests() {
  console.log('🧪 Starting Lead Conversion System Tests...\n');
  
  let testLeadId = null;
  const createdEntities = {
    contacts: [],
    companies: [],
    clients: [],
    deals: [],
    activities: []
  };

  try {
    // 0. Setup: Create a fresh test lead
    console.log('🔄 Setting up test lead...');
    const [leadSetup] = await pool.execute(
      `INSERT INTO leads (company_id, person_name, name, company_name, email, phone, status, owner_id, value, currency) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [1, 'Test Person', 'Test Person', 'Test Company Inc', 'test@person.com', '1234567890', 'New', 1, 5000.00, 'USD']
    );
    testLeadId = leadSetup.insertId;
    console.log(`✅ Test Lead created with ID: ${testLeadId}\n`);

    // Helper to clean up created entities
    const trackEntity = (type, id) => {
      if (id) createdEntities[type].push(id);
    };

    // Case 1: Lead -> Contact only
    console.log('📋 Case 1: Lead -> Contact only...');
    let req = {
      params: { id: testLeadId },
      body: { createContact: true, createCompany: false, createDeal: false },
      companyId: 1,
      userId: 1,
      t: (key) => key
    };
    let res = mockResponse();
    await leadController.convertLead(req, res);
    
    if (res.body && res.body.success) {
      console.log('✅ Controller conversion request succeeded:', JSON.stringify(res.body.data));
      const { contactId, companyId, clientId, dealId } = res.body.data;
      trackEntity('contacts', contactId);
      trackEntity('companies', companyId);
      trackEntity('clients', clientId);
      trackEntity('deals', dealId);

      // Verify contact exists
      const [contacts] = await pool.execute('SELECT * FROM contacts WHERE id = ?', [contactId]);
      if (contacts.length > 0 && contacts[0].name === 'Test Person' && !clientId && !dealId) {
        console.log('   🎉 Verification passed: Contact created correctly, no Company/Deal created.');
      } else {
        throw new Error('Verification failed: Contact verification error');
      }
    } else {
      throw new Error(`Controller request failed: ${res.body?.error}`);
    }

    // Reset Lead Status to 'New' for next test
    await pool.execute('UPDATE leads SET status = "New" WHERE id = ?', [testLeadId]);
    console.log('   🔄 Reset lead status for Case 2\n');

    // Case 2: Lead -> Company only
    console.log('📋 Case 2: Lead -> Company only...');
    req.body = { createContact: false, createCompany: true, createDeal: false };
    res = mockResponse();
    await leadController.convertLead(req, res);
    
    if (res.body && res.body.success) {
      console.log('✅ Controller conversion request succeeded:', JSON.stringify(res.body.data));
      const { contactId, companyId, clientId, dealId } = res.body.data;
      trackEntity('contacts', contactId);
      trackEntity('companies', companyId);
      trackEntity('clients', clientId);
      trackEntity('deals', dealId);

      // Verify company and client exist
      const [companies] = await pool.execute('SELECT * FROM companies WHERE id = ?', [companyId]);
      const [clients] = await pool.execute('SELECT * FROM clients WHERE id = ?', [clientId]);
      if (companies.length > 0 && companies[0].company_name === 'Test Company Inc' && clients.length > 0 && !contactId && !dealId) {
        console.log('   🎉 Verification passed: Company and client created correctly, no Contact/Deal.');
      } else {
        throw new Error('Verification failed: Company verification error');
      }
    } else {
      throw new Error(`Controller request failed: ${res.body?.error}`);
    }

    // Reset Lead Status to 'New' for next test
    await pool.execute('UPDATE leads SET status = "New" WHERE id = ?', [testLeadId]);
    console.log('   🔄 Reset lead status for Case 3\n');

    // Case 3: Lead -> Deal only
    console.log('📋 Case 3: Lead -> Deal only...');
    req.body = { createContact: false, createCompany: false, createDeal: true };
    res = mockResponse();
    await leadController.convertLead(req, res);
    
    if (res.body && res.body.success) {
      console.log('✅ Controller conversion request succeeded:', JSON.stringify(res.body.data));
      const { contactId, companyId, clientId, dealId } = res.body.data;
      trackEntity('contacts', contactId);
      trackEntity('companies', companyId);
      trackEntity('clients', clientId);
      trackEntity('deals', dealId);

      // Verify deal exists
      const [deals] = await pool.execute('SELECT * FROM deals WHERE id = ?', [dealId]);
      if (deals.length > 0 && deals[0].title === 'Test Person Deal' && deals[0].stage === 'New' && !contactId) {
        console.log('   🎉 Verification passed: Deal created correctly.');
      } else {
        throw new Error('Verification failed: Deal verification error');
      }
    } else {
      throw new Error(`Controller request failed: ${res.body?.error}`);
    }

    // Reset Lead Status for next test
    await pool.execute('UPDATE leads SET status = "New" WHERE id = ?', [testLeadId]);
    console.log('   🔄 Reset lead status for Case 4\n');

    // Case 4: Lead -> All 3
    console.log('📋 Case 4: Lead -> All 3...');
    req.body = { createContact: true, createCompany: true, createDeal: true };
    res = mockResponse();
    await leadController.convertLead(req, res);
    
    if (res.body && res.body.success) {
      console.log('✅ Controller conversion request succeeded:', JSON.stringify(res.body.data));
      const { contactId, companyId, clientId, dealId } = res.body.data;
      trackEntity('contacts', contactId);
      trackEntity('companies', companyId);
      trackEntity('clients', clientId);
      trackEntity('deals', dealId);

      // Verify all exist and are linked
      const [contacts] = await pool.execute('SELECT * FROM contacts WHERE id = ?', [contactId]);
      const [companies] = await pool.execute('SELECT * FROM companies WHERE id = ?', [companyId]);
      const [deals] = await pool.execute('SELECT * FROM deals WHERE id = ?', [dealId]);
      
      const checkContactLink = contacts[0].client_id === clientId;
      const checkDealLinks = deals[0].contact_id === contactId && deals[0].client_id === clientId;
      
      if (contacts.length > 0 && companies.length > 0 && deals.length > 0 && checkContactLink && checkDealLinks) {
        console.log('   🎉 Verification passed: Contact, Company, and Deal created and properly linked.');
      } else {
        throw new Error('Verification failed: Relationships linking verification error');
      }
    } else {
      throw new Error(`Controller request failed: ${res.body?.error}`);
    }

    // Case 5: Existing company reuse
    console.log('\n📋 Case 5: Existing company reuse...');
    // Create a second lead with the same company name
    const [secondLead] = await pool.execute(
      `INSERT INTO leads (company_id, person_name, name, company_name, email, phone, status, owner_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [1, 'Second Person', 'Second Person', 'Test Company Inc', 'second@person.com', '0987654321', 'New', 1]
    );
    const secondLeadId = secondLead.insertId;
    
    req = {
      params: { id: secondLeadId },
      body: { createContact: true, createCompany: true, createDeal: true },
      companyId: 1,
      userId: 1,
      t: (key) => key
    };
    res = mockResponse();
    await leadController.convertLead(req, res);
    
    if (res.body && res.body.success) {
      console.log('✅ Controller conversion request succeeded:', JSON.stringify(res.body.data));
      const { contactId, companyId, clientId, dealId } = res.body.data;
      trackEntity('contacts', contactId);
      trackEntity('deals', dealId);

      // Check that the company ID matches the previously created company ID
      const previouslyCreatedCompanyId = createdEntities.companies[createdEntities.companies.length - 1];
      if (companyId === previouslyCreatedCompanyId) {
        console.log(`   🎉 Verification passed: Existing Company ID (${companyId}) was successfully reused.`);
      } else {
        throw new Error(`Verification failed: Company duplicated (First ID: ${previouslyCreatedCompanyId}, Second ID: ${companyId})`);
      }
    } else {
      throw new Error(`Controller request failed for second lead: ${res.body?.error}`);
    }
    
    // Clean up second lead
    await pool.execute('DELETE FROM leads WHERE id = ?', [secondLeadId]);

    // Case 6: Already converted lead duplicate prevention
    console.log('\n📋 Case 6: Already converted lead duplicate prevention...');
    req = {
      params: { id: testLeadId },
      body: { createContact: true, createCompany: true, createDeal: true },
      companyId: 1,
      userId: 1,
      t: (key) => key
    };
    res = mockResponse();
    await leadController.convertLead(req, res);
    
    if (res.statusCode === 400) {
      console.log('   🎉 Verification passed: Re-conversion correctly blocked with 400 Bad Request.');
    } else {
      throw new Error(`Verification failed: Expected 400 Bad Request, got ${res.statusCode}`);
    }

  } catch (e) {
    console.error('\n❌ TEST RUN FAILED WITH ERROR:', e.message);
  } finally {
    // Cleanup setup data
    console.log('\n🧹 Cleaning up test data...');
    if (testLeadId) {
      await pool.execute('DELETE FROM leads WHERE id = ?', [testLeadId]);
    }
    for (const id of createdEntities.contacts) {
      await pool.execute('DELETE FROM contacts WHERE id = ?', [id]);
    }
    for (const id of createdEntities.companies) {
      await pool.execute('DELETE FROM companies WHERE id = ?', [id]);
    }
    for (const id of createdEntities.clients) {
      await pool.execute('DELETE FROM clients WHERE id = ?', [id]);
    }
    for (const id of createdEntities.deals) {
      await pool.execute('DELETE FROM deals WHERE id = ?', [id]);
      await pool.execute('DELETE FROM deal_contacts WHERE deal_id = ?', [id]);
    }
    // Delete test activities
    await pool.execute('DELETE FROM activities WHERE description LIKE "%Lead converted to%" OR description LIKE "%Test Person%"');

    console.log('🧹 Cleanup completed.');
    process.exit(0);
  }
}

runTests();
