require('dotenv').config();
const pool = require('../config/db');
const leadCallsController = require('../controllers/leadCallsController');

// Mock Express req and res
const mockReqRes = (body, params, query) => {
  const req = {
    body,
    params,
    query,
    user: { id: 1 },
    t: (key) => key
  };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return { req, res };
};

async function runTest() {
  console.log("Starting lead call log test...");
  
  // 1. Create a dummy lead first
  const [leadResult] = await pool.execute(
    "INSERT INTO leads (company_id, person_name, email, status) VALUES (1, 'Test Lead for Call', 'call@test.com', 'New')"
  );
  const leadId = leadResult.insertId;
  console.log(`Created test lead with ID: ${leadId}`);

  // 2. Call leadCallsController.createCall
  const body = {
    call_date: new Date().toISOString().split('T')[0],
    call_time: '12:00',
    phone_number: '9876543210',
    call_type: 'Outgoing',
    duration_minutes: 5,
    subject: 'Intro Call',
    message: 'Spoke with the lead.'
  };
  const params = { lead_id: leadId };
  const query = { company_id: 1 };

  const { req, res } = mockReqRes(body, params, query);

  try {
    await leadCallsController.createCall(req, res);
    console.log("Response status code:", res.statusCode);
    console.log("Response body:", JSON.stringify(res.body, null, 2));

    if (res.body && res.body.success) {
      console.log("✅ Lead call log created successfully!");
    } else {
      console.error("❌ Failed to log lead call:", res.body?.error);
    }
  } catch (err) {
    console.error("Exception during test:", err);
  } finally {
    // Cleanup
    console.log("Cleaning up test data...");
    if (res.body?.data?.id) {
      await pool.execute("DELETE FROM lead_calls WHERE id = ?", [res.body.data.id]);
    }
    await pool.execute("DELETE FROM leads WHERE id = ?", [leadId]);
    console.log("Cleanup complete.");
    process.exit(0);
  }
}

runTest();
