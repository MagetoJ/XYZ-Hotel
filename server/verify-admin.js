const dotenv = require('dotenv');
const path = require('path');
const knex = require('knex');
const bcryptjs = require('bcryptjs');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }
});

const logFile = path.join(__dirname, 'admin-user.log');
const logs = [];

function log(message) {
  console.log(message);
  logs.push(message);
}

async function verifyAdmin() {
  try {
    log('🔍 Verifying admin user (jabez)...\n');

    const user = await db('staff').where({ username: 'jabez' }).first();

    if (!user) {
      log('❌ Jabez user NOT found in database');
      log('\n📝 Creating jabez user with hashed password...');
      
      const hashedPassword = await bcryptjs.hash('Jabez123', 10);
      const result = await db('staff').insert({
        username: 'jabez',
        name: 'Jabez',
        email: 'jabez@example.com',
        role: 'admin',
        password: hashedPassword,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');
      
      log('✅ Jabez user created successfully!');
      log('   Username: jabez');
      log('   Name: Jabez');
      log('   Email: jabez@example.com');
      log('   Role: admin');
      log('   Status: active');
      log('   Password: Jabez123 (hashed)');
      
      const isValid = await bcryptjs.compare('Jabez123', result[0].password);
      log('   ✓ Password verification: ' + (isValid ? 'PASSED' : 'FAILED'));
    } else {
      log('✅ Jabez user found!');
      log('   ID: ' + user.id);
      log('   Username: ' + user.username);
      log('   Name: ' + user.name);
      log('   Email: ' + user.email);
      log('   Role: ' + user.role);
      log('   Status: ' + (user.is_active ? 'active' : 'inactive'));
      log('   Password Hash: ' + (user.password ? user.password.substring(0, 50) + '...' : 'NOT SET'));
      
      if (user.password) {
        const isValid = await bcryptjs.compare('Jabez123', user.password);
        log('   ✓ Password verification: ' + (isValid ? 'PASSED ✓' : 'FAILED ❌'));
        
        if (!isValid) {
          log('\n⚠️  Password mismatch! Updating password...');
          const hashedPassword = await bcryptjs.hash('Jabez123', 10);
          await db('staff').where({ id: user.id }).update({
            password: hashedPassword,
            updated_at: new Date()
          });
          log('✅ Password updated successfully');
        }
      } else {
        log('   ⚠️  No password set! Setting password...');
        const hashedPassword = await bcryptjs.hash('Jabez123', 10);
        await db('staff').where({ id: user.id }).update({
          password: hashedPassword,
          updated_at: new Date()
        });
        log('✅ Password set successfully');
      }
      
      if (!user.is_active) {
        log('\n⚠️  User is inactive. Activating...');
        await db('staff').where({ id: user.id }).update({ is_active: true });
        log('✅ User activated');
      }
    }

    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('LOGIN CREDENTIALS');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('Username: jabez');
    log('Password: Jabez123');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    log('❌ Error: ' + error.message);
    log('Details: ' + JSON.stringify(error, null, 2));
  } finally {
    await db.destroy();
    fs.writeFileSync(logFile, logs.join('\n'), 'utf8');
  }
}

verifyAdmin();
