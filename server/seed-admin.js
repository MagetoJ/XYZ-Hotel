const dotenv = require('dotenv');
const path = require('path');
const knex = require('knex');
const bcryptjs = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }
});

async function seedAdmin() {
  try {
    console.log('🔧 Seeding admin user (jabez)...\n');

    const hashedPassword = await bcryptjs.hash('Jabez123', 10);
    console.log('✓ Password hashed');

    const existingUser = await db('staff').where({ username: 'jabez' }).first();

    if (existingUser) {
      console.log('✓ Jabez user exists. Updating...');
      await db('staff')
        .where({ username: 'jabez' })
        .update({
          password: hashedPassword,
          is_active: true,
          role: 'admin',
          updated_at: new Date()
        });
    } else {
      console.log('📝 Creating jabez user...');
      await db('staff').insert({
        username: 'jabez',
        name: 'Jabez',
        email: 'jabez@example.com',
        role: 'admin',
        password: hashedPassword,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    const user = await db('staff').where({ username: 'jabez' }).first();
    console.log('\n✅ Admin user created/updated successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username: jabez');
    console.log('Password: Jabez123');
    console.log('Email: jabez@example.com');
    console.log('Role: admin');
    console.log('Status: active');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const isValidPassword = await bcryptjs.compare('Jabez123', user.password);
    if (isValidPassword) {
      console.log('✓ Password verification: PASSED');
    } else {
      console.log('❌ Password verification: FAILED');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

seedAdmin();
