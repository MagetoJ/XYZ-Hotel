exports.up = function(knex) {
  return knex.raw(`
    -- Ensure completed_at column exists
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
    
    -- Create indexes if they don't exist
    CREATE INDEX IF NOT EXISTS orders_created_at_index ON orders(created_at);
    CREATE INDEX IF NOT EXISTS orders_completed_at_index ON orders(completed_at);
    CREATE INDEX IF NOT EXISTS orders_status_index ON orders(status);
  `)
    .then(() => {
      return knex('staff')
        .where({ username: 'MagetoJ' })
        .update({ role: 'superadmin' });
    })
    .then(() => {
      console.log('✅ Migration: Added completed_at column, indexes to orders table, and ensured MagetoJ has superadmin role');
    });
};

exports.down = function(knex) {
  return knex.raw(`
    -- Drop indexes
    DROP INDEX IF EXISTS orders_created_at_index;
    DROP INDEX IF EXISTS orders_completed_at_index;
    DROP INDEX IF EXISTS orders_status_index;
    
    -- Drop column
    ALTER TABLE orders DROP COLUMN IF EXISTS completed_at;
  `)
    .then(() => {
      return knex('staff')
        .where({ username: 'MagetoJ' })
        .update({ role: 'admin' });
    });
};
