/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    -- Add missing columns to orders table
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    ALTER TABLE orders DROP COLUMN IF EXISTS customer_name;
    ALTER TABLE orders DROP COLUMN IF EXISTS customer_phone;
    ALTER TABLE orders DROP COLUMN IF EXISTS notes;
    ALTER TABLE orders DROP COLUMN IF EXISTS discount_amount;
    ALTER TABLE orders DROP COLUMN IF EXISTS payment_status;
  `);
};