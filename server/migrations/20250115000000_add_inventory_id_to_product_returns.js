/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 * 
 * Migration to add inventory_id to product_returns table
 * This allows product returns to directly track inventory items instead of products
 */
exports.up = async function(knex) {
  // Check if inventory_id column already exists
  const hasInventoryId = await knex.schema.hasColumn('product_returns', 'inventory_id');
  
  if (!hasInventoryId) {
    await knex.schema.alterTable('product_returns', (table) => {
      table.integer('inventory_id').references('inventory_items.id').nullable();
    });

    // Create index for faster queries
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_product_returns_inventory_id ON product_returns(inventory_id)`);
  }

  // Keep product_id for backwards compatibility but make it nullable
  // This allows existing product-based returns to coexist with new inventory-based returns
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('product_returns', (table) => {
    table.dropColumn('inventory_id');
  });
};