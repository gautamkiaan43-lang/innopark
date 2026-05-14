const axios = require('axios');

async function testApi() {
  try {
    const response = await axios.get('http://localhost:8010/api/v1/companies');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
    if (e.response) console.log('Response:', e.response.data);
  }
}

testApi();
