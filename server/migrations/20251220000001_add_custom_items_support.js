/**
 * Migration to add custom items support to order_items table
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    -- Make product_id nullable to support custom items
    ALTER TABLE order_items 
    ALTER COLUMN product_id DROP NOT NULL;

    -- Add custom_name column for custom items
    ALTER TABLE order_items 
    ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255);

    -- Add is_custom flag to clearly identify custom items
    ALTER TABLE order_items 
    ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;

    -- Create index for custom items queries
    CREATE INDEX IF NOT EXISTS idx_order_items_custom ON order_items(is_custom);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    -- Remove the custom items support
    DROP INDEX IF EXISTS idx_order_items_custom;
    
    ALTER TABLE order_items 
    DROP COLUMN IF EXISTS is_custom;

    ALTER TABLE order_items 
    DROP COLUMN IF EXISTS custom_name;

    -- Make product_id NOT NULL again
    ALTER TABLE order_items 
    ALTER COLUMN product_id SET NOT NULL;
  `);
};
