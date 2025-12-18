const http = require('http');

console.log('🔍 Testing API endpoint...\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/inventory',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('✅ Response Status:', res.statusCode);
    console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
    try {
      const json = JSON.parse(data);
      console.log('Response Body:', JSON.stringify(json, null, 2).substring(0, 500));
      if (Array.isArray(json)) {
        console.log(`\n📊 Items returned: ${json.length}`);
      }
    } catch (e) {
      console.log('Response Body (raw):', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Connection Error:', e.message);
  console.log('\n💡 Troubleshooting:');
  console.log('   1. Is the server running? Run: npm run dev');
  console.log('   2. Is port 3000 available?');
  console.log('   3. Check server logs for errors');
});

console.log('📡 Sending request to http://localhost:3000/api/inventory...');
req.end();

setTimeout(() => {
  console.log('\n⏱️ Request timeout - server may not be running');
  process.exit(1);
}, 5000);
