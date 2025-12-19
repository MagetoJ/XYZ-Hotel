const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const knex = require('knex')(require('./knexfile')[process.env.NODE_ENV || 'development']);

async function clearUsers() {
  try {
    console.log('\n🗑️  Starting user cleanup...\n');

    // Disable foreign key constraints temporarily
    await knex.raw('SET session_replication_role = replica');

    // Tables that contain user/staff data
    const userTables = [
      'staff',
      'attendance',
      'shifts'
    ];

    for (const table of userTables) {
      try {
        const count = await knex(table).count('* as count').first();
        const recordCount = count.count;

        if (recordCount > 0) {
          await knex(table).del();
          console.log(`✅ ${table}: Deleted ${recordCount} records`);
        } else {
          console.log(`⊘ ${table}: Already empty`);
        }
      } catch (err) {
        console.log(`⚠️  ${table}: Skipped (${err.message})`);
      }
    }

    // Re-enable foreign key constraints
    await knex.raw('SET session_replication_role = default');

    // Reset staff sequence
    try {
      await knex.raw('ALTER SEQUENCE staff_id_seq RESTART WITH 1');
      console.log('\n✅ Reset staff ID sequence');
    } catch (err) {
      console.log(`\n⚠️  Could not reset sequence: ${err.message}`);
    }

    console.log('\n✨ All users cleared successfully!\n');
    console.log('📋 Remaining tables with data:');

    const tables = await knex.raw(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'knex%'
      ORDER BY tablename
    `);

    for (const { tablename } of tables.rows) {
      const count = await knex(tablename).count('* as count').first();
      if (count.count > 0) {
        console.log(`   • ${tablename}: ${count.count} records`);
      }
    }

    console.log('\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error clearing users:', err.message);
    process.exit(1);
  }
}

clearUsers();
