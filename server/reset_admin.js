// server/reset_admin.js
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

async function resetPassword() {
  // 👇 TYPE YOUR NEW PASSWORD HERE
  const NEW_PLAIN_PASSWORD = 'Kizito@2026';
  const SALT_ROUNDS = 10;

  try {
    console.log(`🔒 Hashing password for user "admin"...`);
    const hash = await bcrypt.hash(NEW_PLAIN_PASSWORD, SALT_ROUNDS);

    console.log('🔌 Updating database...');
    const count = await db('staff')
      .where({ username: 'admin' })
      .update({
        password: hash,
        updated_at: new Date()
      });

    if (count > 0) {
      console.log('✅ Success! Admin password has been changed.');
    } else {
      console.log('❌ Error: User "admin" was not found in the database.');
    }

  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    await db.destroy();
  }
}

resetPassword();