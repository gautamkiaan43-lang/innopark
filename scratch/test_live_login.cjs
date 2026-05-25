const http = require('https');

function fetchUrl(url, method = 'GET', postData = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  console.log("=== CHECKING LIVE HEALTH ===");
  try {
    const res = await fetchUrl('https://innopark-production.up.railway.app/health');
    console.log(`Health Status Code: ${res.statusCode}`);
    console.log(`Health Body: ${res.body}`);
  } catch (err) {
    console.error("Health Check Error:", err.message);
  }

  console.log("\n=== CHECKING LIVE LOGIN (POST /api/v1/auth/login) ===");
  try {
    const postData = JSON.stringify({ email: 'test@example.com', password: 'password', role: 'admin' });
    const res = await fetchUrl('https://innopark-production.up.railway.app/api/v1/auth/login', 'POST', postData);
    console.log(`Login Status Code: ${res.statusCode}`);
    console.log(`Login Body: ${res.body}`);
  } catch (err) {
    console.error("Login Error:", err.message);
  }
}

run();
