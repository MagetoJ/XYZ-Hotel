#!/usr/bin/env node

const http = require('http');

console.log('🔍 INVENTORY DIAGNOSTIC TEST\n');

// Function to make HTTP request
function makeRequest(method, path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || 'test'}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Main test
(async () => {
  try {
    console.log('1️⃣ Checking if server is running on localhost:3000...');
    const healthCheck = await makeRequest('GET', '/api/inventory', 'dummy');
    console.log(`   Status: ${healthCheck.status}`);
    
    if (healthCheck.status === 401 || healthCheck.status === 403) {
      console.log('   ✅ Server is running (auth error is expected without real token)\n');
    } else if (healthCheck.status === 200) {
      console.log('   ✅ Server is running and returned data\n');
    } else {
      console.log(`   ⚠️  Unexpected status: ${healthCheck.status}\n`);
    }

    console.log('2️⃣ API Response Summary:');
    if (Array.isArray(healthCheck.data)) {
      console.log(`   📊 Items returned: ${healthCheck.data.length}`);
      if (healthCheck.data.length > 0) {
        console.log(`   First item: ${healthCheck.data[0].name}`);
      }
    } else {
      console.log(`   📄 Response type: ${typeof healthCheck.data}`);
      console.log(`   Message: ${healthCheck.data.message || healthCheck.data}`);
    }

    console.log('\n3️⃣ Next Steps:');
    console.log('   • If server is running: ✅ Good, move to frontend testing');
    console.log('   • If server is NOT running: ❌ Run "npm run dev" in project root');
    console.log('   • Open browser DevTools (F12) and check Console tab');
    console.log('   • Upload a CSV file and watch the console logs');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Is the server running? Run: npm run dev');
    console.log('   2. Is port 3000 available?');
    console.log('   3. Check that you\'re in the right directory');
  }
})();
