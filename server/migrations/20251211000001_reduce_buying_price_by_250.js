/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 * Reduces buying_price by 250 KES for all inventory items
 */
exports.up = async function(knex) {
  try {
    // Store original prices for rollback purposes
    await knex.raw(`
      UPDATE inventory_items 
      SET buying_price = GREATEST(0, buying_price - 250),
          updated_at = NOW()
      WHERE buying_price > 0;
    `);
    
    const result = await knex('inventory_items')
      .count('* as count')
      .where('buying_price', '>', 0)
      .first();
    
    console.log(`✅ Updated buying price for ${result.count} inventory items (reduced by 250 KES each)`);
  } catch (error) {
    console.error('❌ Error updating buying prices:', error);
    throw error;
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  try {
    // Restore original prices (add 250 back)
    await knex.raw(`
      UPDATE inventory_items 
      SET buying_price = buying_price + 250,
          updated_at = NOW()
      WHERE buying_price >= 0;
    `);
    
    console.log('⏮️ Rolled back buying price changes (added 250 KES back to each item)');
  } catch (error) {
    console.error('❌ Error rolling back buying prices:', error);
    throw error;
  }
};
