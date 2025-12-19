const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const knex = require('knex')(require('./knexfile')[process.env.NODE_ENV || 'development']);

async function clearAllData() {
  try {
    console.log('🗑️  Starting data cleanup...');
    
    // Get all tables
    const tables = await knex.raw(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'knex%'
      ORDER BY tablename
    `);

    console.log(`\n📋 Found ${tables.rows.length} tables to clear:\n`);

    // Disable foreign key constraints temporarily
    await knex.raw('SET session_replication_role = replica');

    for (const { tablename } of tables.rows) {
      try {
        const count = await knex(tablename).count('* as count').first();
        const recordCount = count.count;
        
        if (recordCount > 0) {
          await knex(tablename).del();
          console.log(`✅ ${tablename}: Cleared ${recordCount} records`);
        } else {
          console.log(`⊘ ${tablename}: Already empty`);
        }
      } catch (err) {
        console.log(`⚠️  ${tablename}: Skipped (${err.message})`);
      }
    }

    // Re-enable foreign key constraints
    await knex.raw('SET session_replication_role = default');

    // Reset sequences
    console.log('\n🔄 Resetting sequences...\n');
    const sequences = await knex.raw(`
      SELECT sequence_name FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);

    for (const { sequence_name } of sequences.rows) {
      try {
        await knex.raw(`ALTER SEQUENCE ${sequence_name} RESTART WITH 1`);
        console.log(`✅ Reset sequence: ${sequence_name}`);
      } catch (err) {
        console.log(`⚠️  ${sequence_name}: Skipped`);
      }
    }

    console.log('\n✨ Database cleared successfully! All tables are now empty.\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error clearing database:', err.message);
    process.exit(1);
  }
}

clearAllData();
