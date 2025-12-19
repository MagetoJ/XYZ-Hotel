const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server/.env') });

async function testEndpoint(host, port, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data.slice(0, 100)
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ status: 'ERROR', data: err.message });
    });

    req.end();
  });
}

async function verify() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     🔍 POS System Setup Verification         ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Test Backend
  console.log('📡 Testing Backend (http://localhost:3000)...');
  const backendHealth = await testEndpoint('localhost', 3000, '/api/health');
  
  if (backendHealth.status === 200) {
    console.log('   ✅ Backend is running and responding');
    console.log(`   Environment: ${backendHealth.data.environment}`);
  } else {
    console.log(`   ❌ Backend error: ${backendHealth.status}`);
  }

  console.log('\n🌐 Testing Frontend (http://localhost:5173)...');
  const frontendTest = await testEndpoint('localhost', 5173, '/');
  
  if (frontendTest.status === 200) {
    console.log('   ✅ Frontend is running and responding');
  } else {
    console.log(`   ❌ Frontend error: ${frontendTest.status}`);
  }

  // Database connection info
  console.log('\n🗄️  Database Configuration:');
  console.log(`   URL: ${process.env.DATABASE_URL.split('@')[1] || 'N/A'}`);
  console.log(`   Port: ${process.env.PORT}`);

  // CORS Configuration
  console.log('\n🔒 CORS Configuration:');
  console.log('   Frontend proxy: /api → http://localhost:3000');
  console.log('   Backend CORS: Configured for http://localhost:5173');

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║          ✨ Setup Verification Done           ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  console.log('🚀 Access your application:');
  console.log('   Frontend: http://localhost:5173');
  console.log('   Backend API: http://localhost:3000/api/health\n');
}

verify();
