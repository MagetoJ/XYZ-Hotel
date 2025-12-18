const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
let envConfig = dotenv.config({ path: path.join(__dirname, '.env') });
if (envConfig.error) {
  console.log('No .env file found, checking .env.production...');
  envConfig = dotenv.config({ path: path.join(__dirname, '.env.production') });
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pos_mocha_dev';
const knex = require('knex')({
  client: 'pg',
  connection: {
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
  }
});

async function setAndReduceBuyingPrices() {
  try {
    console.log('🔄 Starting buying price setup and reduction...\n');

    // Step 1: Set initial buying prices for items without buying_price
    // Using 70% of selling price (cost_per_unit) as a reasonable estimate
    const setResult = await knex('inventory_items')
      .where('buying_price', 0)
      .where('cost_per_unit', '>', 0)
      .update({
        buying_price: knex.raw('ROUND((cost_per_unit * 0.70)::numeric, 2)'),
        updated_at: new Date()
      });

    console.log(`✅ Set initial buying prices for ${setResult} items (70% of selling price)`);

    // Step 2: Reduce all buying prices by 250 KES
    const reduceResult = await knex('inventory_items')
      .where('buying_price', '>', 250)
      .update({
        buying_price: knex.raw('buying_price - 250'),
        updated_at: new Date()
      });

    console.log(`✅ Reduced buying price by 250 KES for ${reduceResult} items\n`);

    // Step 3: Show statistics
    const totalCount = await knex('inventory_items').count('* as count').first();
    const withPricesCount = await knex('inventory_items')
      .where('buying_price', '>', 0)
      .count('* as count')
      .first();

    console.log(`📊 Summary:`);
    console.log(`   Total items: ${totalCount.count}`);
    console.log(`   Items with buying price: ${withPricesCount.count}\n`);

    // Step 4: Show top 15 items with new margins
    const topItems = await knex('inventory_items')
      .select(
        'id',
        'name',
        'buying_price',
        'cost_per_unit',
        knex.raw('ROUND(((cost_per_unit - buying_price) / NULLIF(cost_per_unit, 0) * 100)::numeric, 1) as margin')
      )
      .where('cost_per_unit', '>', 0)
      .where('buying_price', '>', 0)
      .orderByRaw('margin DESC')
      .limit(15);

    console.log('📋 Top 15 Items by Profit Margin:');
    console.log('─'.repeat(100));
    console.log('Name                          | Buying Price | Selling Price | Profit Margin');
    console.log('─'.repeat(100));
    
    topItems.forEach(item => {
      const name = (item.name || 'Unknown').substring(0, 30).padEnd(30);
      const buyPrice = `KES ${item.buying_price}`.padStart(12);
      const sellPrice = `KES ${item.cost_per_unit}`.padStart(13);
      const margin = `${item.margin || 0}%`.padStart(14);
      console.log(`${name} | ${buyPrice} | ${sellPrice} | ${margin}`);
    });
    console.log('─'.repeat(100));

    // Step 5: Show profit summary
    const profitSummary = await knex('inventory_items')
      .select(
        knex.raw('COUNT(*) as item_count'),
        knex.raw('ROUND(AVG(((cost_per_unit - buying_price) / NULLIF(cost_per_unit, 0) * 100))::numeric, 1) as avg_margin'),
        knex.raw('ROUND(MIN(((cost_per_unit - buying_price) / NULLIF(cost_per_unit, 0) * 100))::numeric, 1) as min_margin'),
        knex.raw('ROUND(MAX(((cost_per_unit - buying_price) / NULLIF(cost_per_unit, 0) * 100))::numeric, 1) as max_margin'),
        knex.raw('ROUND(SUM(current_stock * (cost_per_unit - buying_price))::numeric, 2) as total_profit_potential')
      )
      .where('cost_per_unit', '>', 0)
      .where('buying_price', '>', 0)
      .first();

    console.log('\n📈 Profit Analysis:');
    console.log(`   Items analyzed: ${profitSummary.item_count}`);
    console.log(`   Average profit margin: ${profitSummary.avg_margin}%`);
    console.log(`   Min margin: ${profitSummary.min_margin}%`);
    console.log(`   Max margin: ${profitSummary.max_margin}%`);
    console.log(`   Total profit potential: KES ${parseFloat(profitSummary.total_profit_potential || 0).toLocaleString('en-KE')}`);

    console.log('\n✨ Buying price setup and reduction completed successfully!\n');
    await knex.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating buying prices:', error.message);
    await knex.destroy();
    process.exit(1);
  }
}

setAndReduceBuyingPrices();
