const mysql = require('mysql2/promise');

async function testConversion() {
  const config = { host: '127.0.0.1', user: 'root', password: '', database: 'innopark-db', port: 3306 };
  try {
    const connection = await mysql.createConnection(config);
    console.log("Connected to DB. Starting transaction test...");
    
    // Simulate convertLead query sequence on a temporary test transaction
    await connection.beginTransaction();
    try {
      // 1. Create a dummy lead
      const [leadResult] = await connection.execute(
        `INSERT INTO leads (company_id, lead_type, company_name, person_name, email, phone, status, address)
         VALUES (2, 'Organization', 'Test Company Inc', 'John Test', 'test@example.com', '12345678', 'New', 'DE')`
      );
      const leadId = leadResult.insertId;
      console.log(`Created test lead with ID: ${leadId}`);
      
      // 2. Insert into clients
      const [clientResult] = await connection.execute(
        `INSERT INTO clients (company_name, email, phone_number, address, city, state, country, status, company_id, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Test Company Inc', 'test@example.com', '12345678', 'DE', 'City', 'State', 'Germany', 'Active', 2, 1]
      );
      const clientId = clientResult.insertId;
      console.log(`Created test client with ID: ${clientId}`);
      
      // 3. Insert into contacts
      const [contactResult] = await connection.execute(
        `INSERT INTO contacts (company_id, client_id, lead_id, name, company, email, phone, status, is_primary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [2, clientId, leadId, 'John Test', 'Test Company Inc', 'test@example.com', '12345678', 'Active', 1]
      );
      const contactId = contactResult.insertId;
      console.log(`Created test contact with ID: ${contactId}`);
      
      // 4. Insert into deals
      const [dealResult] = await connection.execute(
        `INSERT INTO deals (company_id, client_id, contact_id, lead_id, deal_number, title, stage, status, deal_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [2, clientId, contactId, leadId, 'DEAL#TEST999', 'Test Deal', 'New', 'Draft']
      );
      const dealId = dealResult.insertId;
      console.log(`Created test deal with ID: ${dealId}`);
      
      // 5. Link in deal_contacts
      console.log("Attempting to insert into deal_contacts...");
      await connection.execute(
        `INSERT INTO deal_contacts (deal_id, contact_id, is_primary) VALUES (?, ?, ?)`,
        [dealId, contactId, 1]
      );
      console.log("Successfully inserted into deal_contacts!");
      
      await connection.rollback(); // Rollback so we don't pollute the DB
      console.log("Transaction rolled back successfully.");
    } catch (err) {
      console.error("TRANSACTION FAILED:", err);
      await connection.rollback();
    }
    
    await connection.end();
  } catch (e) {
    console.error("Failed to connect:", e);
  }
}

testConversion();
