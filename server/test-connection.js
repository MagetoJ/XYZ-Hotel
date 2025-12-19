const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const knex = require('knex')(require('./knexfile')[process.env.NODE_ENV || 'development']);

async function testConnection() {
  try {
    console.log('\n🔍 Testing database connection...\n');

    // Test basic connection
    const result = await knex.raw('SELECT current_database(), current_user, now()');
    console.log('✅ Database Connection: SUCCESS');
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    console.log(`   Time: ${result.rows[0].now}\n`);

    // List all tables
    const tables = await knex.raw(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'knex%'
      ORDER BY tablename
    `);

    console.log(`📋 Tables in database (${tables.rows.length}):\n`);
    for (const { tablename } of tables.rows) {
      const count = await knex(tablename).count('* as count').first();
      const status = count.count === 0 ? '🟢 EMPTY' : `🔴 ${count.count} rows`;
      console.log(`   ${tablename.padEnd(30)} ${status}`);
    }

    console.log('\n✨ Database is properly configured!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Connection Error:', err.message);
    process.exit(1);
  }
}

testConnection();
