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

async function resetPassword() {
  try {
    const username = process.env.SUPERADMIN_USERNAME || 'MagetoJ';
    const plainPassword = process.env.SUPERADMIN_PASSWORD || 'Jabez2026';

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║    🔄 Resetting Superadmin Password            ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log(`🔍 Finding user "${username}"...`);
    const user = await db('staff').where({ username }).first();
    
    if (!user) {
      console.log(`❌ User "${username}" not found!`);
      return;
    }

    console.log(`✅ Found user: ${user.name}`);
    console.log(`🔐 Hashing new password...`);
    
    const hashedPassword = await bcryptjs.hash(plainPassword, 10);
    
    console.log(`📝 Updating password in database...`);
    await db('staff')
      .where({ id: user.id })
      .update({ 
        password: hashedPassword,
        updated_at: new Date()
      });

    console.log('\n✅ Password reset successfully!\n');
    console.log('🔑 Login Credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${plainPassword}\n`);

    const updatedUser = await db('staff').where({ id: user.id }).first();
    console.log('Verification - Password hash updated:', updatedUser.password.substring(0, 30) + '...');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

resetPassword();
