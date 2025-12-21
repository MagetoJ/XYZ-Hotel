require('dotenv').config({ path: './server/.env' });
const knex = require('knex');
const bcrypt = require('bcryptjs');

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  }
});

async function addSuperAdmin() {
  try {
    const username = process.env.SUPERADMIN_USERNAME || 'MagetoJ';
    const plainPassword = process.env.SUPERADMIN_PASSWORD || 'Jabez2026';

    console.log(`🔍 Checking if user "${username}" exists...`);
    
    // Check if user already exists
    const existingUser = await db('staff').where({ username }).first();
    if (existingUser) {
      console.log(`✅ User "${username}" already exists!`);
      console.log('User ID:', existingUser.id);
      console.log('Role:', existingUser.role);
      console.log('Is Active:', existingUser.is_active);
      return;
    }

    console.log('🔐 Hashing password...');
    // Hash the password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    console.log('📝 Creating superadmin user...');
    // Add the superadmin user
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
    }).returning(['id', 'username', 'name', 'role', 'email']);

    console.log('✅ Superadmin user added successfully!');
    console.log('User Details:', newUser[0]);
  } catch (error) {
    console.error('❌ Error adding superadmin:', error.message);
  } finally {
    await db.destroy();
  }
}

addSuperAdmin();
