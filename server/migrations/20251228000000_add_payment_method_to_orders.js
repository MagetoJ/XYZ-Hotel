/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    -- Add payment_method column to orders table if it doesn't exist
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    -- Drop payment_method column
    ALTER TABLE orders
    DROP COLUMN IF EXISTS payment_method;
  `);
};