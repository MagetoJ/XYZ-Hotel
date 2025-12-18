// server/add_new_kizito.js
const bcrypt = require('bcrypt');
const knex = require('knex');
const path = require('path');
const dotenv = require('dotenv');

// 1. Load configuration
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });

// 2. Setup Database Connection
const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  }
});

async function addKizitoAdmin() {
  const NEW_USER = {
    username: 'Kizito-MH',
    password_plain: 'KizitoMH2026', // This will be hashed
    name: 'Kizito MH',              // Display name
    role: 'admin',
    employee_id: 'EMP-KIZITO',      // Unique ID
    pin: '2026',                    // Login PIN
    email: 'kizito@example.com',    // Placeholder email
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  };

  try {
    // 1. Check if username already exists
    const existing = await db('staff').where({ username: NEW_USER.username }).first();
    if (existing) {
      console.log(`❌ User "${NEW_USER.username}" already exists! ID: ${existing.id}`);
      return;
    }

    // 2. Hash the password
    console.log('🔒 Hashing password...');
    const hash = await bcrypt.hash(NEW_USER.password_plain, 10);

    // 3. Insert the new user
    console.log('📝 Adding user to database...');
    const [insertedUser] = await db('staff').insert({
      username: NEW_USER.username,
      password: hash,
      name: NEW_USER.name,
      role: NEW_USER.role,
      employee_id: NEW_USER.employee_id,
      pin: NEW_USER.pin,
      email: NEW_USER.email,
      is_active: NEW_USER.is_active,
      created_at: NEW_USER.created_at,
      updated_at: NEW_USER.updated_at
    }).returning(['id', 'username', 'role']);

    console.log('✅ Success! New admin added:', insertedUser);

  } catch (error) {
    console.error('❌ Error adding user:', error);
  } finally {
    await db.destroy();
  }
}

addKizitoAdmin();