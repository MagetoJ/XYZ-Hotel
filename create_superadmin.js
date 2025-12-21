const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server/.env') });
const knex = require('knex');
const bcrypt = require('bcryptjs');

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  }
});

async function createSuperAdmin() {
  try {
    const username = process.env.SUPERADMIN_USERNAME || 'MagetoJ';
    const plainPassword = process.env.SUPERADMIN_PASSWORD || 'Jabez2026';

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║    🔐 Creating Superadmin User                ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log(`🔍 Checking if user "${username}" exists...`);
    
    const existingUser = await db('staff').where({ username }).first();
    if (existingUser) {
      console.log(`✅ User "${username}" already exists!`);
      console.log('   ID:', existingUser.id);
      console.log('   Role:', existingUser.role);
      console.log('   Email:', existingUser.email);
      console.log('   Active:', existingUser.is_active);
      console.log('\n');
      return;
    }

    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    console.log('📝 Creating superadmin user in database...');
    const newUser = await db('staff').insert({
      employee_id: 'SUPER001',
      username: username,
      name: 'Superadmin',
      role: 'superadmin',
      email: 'superadmin@xyzhotel.com',
      password: hashedPassword,
      pin: '0000',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning(['id', 'username', 'name', 'role', 'email', 'is_active']);

    console.log('\n✅ SUCCESS! Superadmin user created:\n');
    console.log('   ID:', newUser[0].id);
    console.log('   Username:', newUser[0].username);
    console.log('   Name:', newUser[0].name);
    console.log('   Role:', newUser[0].role);
    console.log('   Email:', newUser[0].email);
    console.log('   Active:', newUser[0].is_active);
    console.log('\n🔑 Login Credentials:');
    console.log('   Username:', username);
    console.log('   Password:', plainPassword);
    console.log('\n');

  } catch (error) {
    console.error('❌ Error creating superadmin:', error.message);
    console.log('\n');
  } finally {
    await db.destroy();
  }
}

createSuperAdmin();
