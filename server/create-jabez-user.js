const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const knex = require('knex')(require('./knexfile')[process.env.NODE_ENV || 'development']);
const bcrypt = require('bcryptjs');

async function createJabezUser() {
  try {
    console.log('\n🔐 Creating admin user: Jabez\n');

    const name = 'Jabez';
    const username = 'jabez';
    const password = 'Jabez123';
    const role = 'admin';

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await knex('staff')
      .insert({
        name,
        username,
        password: hashedPassword,
        role,
        is_active: true,
        email: 'jabez@example.com',
        created_at: new Date(),
        updated_at: new Date()
      })
      .onConflict('username')
      .merge({
        name,
        password: hashedPassword,
        role,
        is_active: true,
        email: 'jabez@example.com',
        updated_at: new Date()
      });

    console.log('✅ User created successfully!\n');
    console.log('📋 User Details:');
    console.log(`   Name: ${name}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${role}`);
    console.log(`   Status: Active\n`);
    console.log('🔑 Login with these credentials:\n');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}\n`);

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error creating user:', err.message);
    process.exit(1);
  }
}

createJabezUser();
