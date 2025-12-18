/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 * 
 * NOTE: This migration has been superseded by 20251105000000_fix_inventory_features.js
 * which provides better idempotency. This migration is kept for backwards compatibility but is largely a no-op.
 */
exports.up = async function(knex) {
  // Skip this migration - it's handled by the newer migration
  return Promise.resolve();
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    DROP TABLE IF EXISTS audit_line_items;
    DROP TABLE IF EXISTS inventory_audits;
    DROP TABLE IF EXISTS stock_transfers;
    DROP TABLE IF EXISTS wastage_logs;
    DROP TABLE IF EXISTS recipe_ingredients;
    DROP TABLE IF EXISTS recipes;
    DROP TABLE IF EXISTS purchase_order_items;
    DROP TABLE IF EXISTS purchase_orders;
    DROP TABLE IF EXISTS suppliers;
  `);
};