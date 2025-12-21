const bcryptjs = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server/.env') });
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  }
});

async function testPassword() {
  try {
    const testPassword = 'Jabez2026';
    const username = 'MagetoJ';
    
    console.log('\n=== Testing Password Authentication ===\n');
    console.log('Test Password:', testPassword);
    console.log('Username:', username);

    const user = await db('staff').where({ username }).first();
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n📦 User Record:');
    console.log('  ID:', user.id);
    console.log('  Username:', user.username);
    console.log('  Name:', user.name);
    console.log('  Role:', user.role);
    console.log('  Password Hash:', user.password.substring(0, 30) + '...');
    console.log('  Password Length:', user.password.length);

    const result = await bcryptjs.compare(testPassword, user.password);
    console.log('\n✅ Password Comparison Result:', result);

    if (!result) {
      console.log('\n⚠️  Password mismatch detected!');
      console.log('Hash pattern:', user.password.substring(0, 20));
      
      const hashRounds = user.password.split('$')[2];
      console.log('Hash rounds:', hashRounds);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

testPassword();
