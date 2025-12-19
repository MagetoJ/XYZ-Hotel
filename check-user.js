require('dotenv').config({ path: './server/.env' });
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }
});

async function checkUser() {
  try {
    const users = await db('staff').select('id', 'username', 'name', 'password', 'is_active', 'role');
    console.log('=== Staff Users ===');
    console.log(JSON.stringify(users, null, 2));
    
    const jabez = await db('staff').where({ username: 'jabez' }).first();
    if (jabez) {
      console.log('\n=== Jabez User Details ===');
      console.log('ID:', jabez.id);
      console.log('Username:', jabez.username);
      console.log('Name:', jabez.name);
      console.log('Email:', jabez.email);
      console.log('Role:', jabez.role);
      console.log('Is Active:', jabez.is_active);
      console.log('Password Hash:', jabez.password ? jabez.password.substring(0, 50) + '...' : 'NOT SET');
      console.log('Password Length:', jabez.password ? jabez.password.length : 0);
    } else {
      console.log('\n❌ Jabez user not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.destroy();
  }
}

checkUser();
