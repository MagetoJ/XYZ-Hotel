import knex from 'knex';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), 'server', '.env.production') });

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  }
});

async function addUser() {
  try {
    // Check if user already exists
    const existingUser = await db('staff').where({ username: 'Kizito' }).first();
    if (existingUser) {
      console.log('User "Kizito" already exists!');
      return;
    }

    // Add the new user
    const [newUser] = await db('staff').insert({
      employee_id: 'EMP006',
      username: 'Kizito',
      name: 'Kizito',
      role: 'admin',
      email: 'kizito@gmail.com',
      password: '$2b$10$cPmcOjHFhPgP2vD7V9RmI.sWmAsXq5SuAVDBtLPiawbqZp88veIS6',
      pin: '8989',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning(['id', 'username', 'name', 'role']);

    console.log('✅ User added successfully:', newUser);
  } catch (error) {
    console.error('❌ Error adding user:', error);
  } finally {
    await db.destroy();
  }
}

addUser();