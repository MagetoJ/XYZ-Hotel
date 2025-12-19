const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const knex = require('knex')(require('./knexfile')[process.env.NODE_ENV || 'development']);

async function verifyUser() {
  try {
    const user = await knex('staff')
      .where('username', 'jabez')
      .select('id', 'name', 'username', 'role', 'is_active', 'created_at')
      .first();

    if (user) {
      console.log('\n✅ User Found!\n');
      console.log('📋 User Details:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.is_active ? 'Active' : 'Inactive'}`);
      console.log(`   Created: ${user.created_at}\n`);
    } else {
      console.log('\n❌ User not found\n');
    }

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

verifyUser();
