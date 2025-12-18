const path = require('path');
const dotenv = require('dotenv');

// Load environment variables - try .env first, then .env.production
let envConfig = dotenv.config({ path: path.join(__dirname, '.env') });
if (envConfig.error) {
  console.log('No .env file found, checking .env.production...');
  envConfig = dotenv.config({ path: path.join(__dirname, '.env.production') });
}

// Database configuration
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pos_mocha_dev';

console.log('🔗 Database URL:', dbUrl.split('@')[0] + '@...');

const knex = require('knex')({
  client: 'pg',
  connection: {
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
  }
});

async function updateBuyingPrices() {
  try {
    console.log('🔄 Starting buying price update...\n');

    // Get count before update
    const beforeCount = await knex('inventory_items')
      .count('* as count')
      .where('buying_price', '>', 0)
      .first();

    console.log(`📊 Items with buying price: ${beforeCount.count}`);

    // Get sample before prices
    const sampleBefore = await knex('inventory_items')
      .select('id', 'name', 'buying_price', 'cost_per_unit')
      .where('buying_price', '>', 0)
      .limit(5);

    console.log('\n📋 Sample of items BEFORE update:');
    sampleBefore.forEach(item => {
      console.log(`   - ${item.name}: Buying Price = KES ${item.buying_price} → Selling Price = KES ${item.cost_per_unit}`);
    });

    // Update buying prices - reduce by 250
    const updateResult = await knex('inventory_items')
      .where('buying_price', '>', 0)
      .update({
        buying_price: knex.raw('GREATEST(0, buying_price - 250)'),
        updated_at: new Date()
      });

    console.log(`\n✅ Updated ${updateResult} items\n`);

    // Get sample after prices
    const sampleAfter = await knex('inventory_items')
      .select('id', 'name', 'buying_price', 'cost_per_unit')
      .where('buying_price', '>', 0)
      .limit(5);

    console.log('📋 Sample of items AFTER update:');
    sampleAfter.forEach(item => {
      console.log(`   - ${item.name}: Buying Price = KES ${item.buying_price} → Selling Price = KES ${item.cost_per_unit}`);
    });

    // Show updated average margin
    const marginData = await knex('inventory_items')
      .select(
        knex.raw('name, buying_price, cost_per_unit, ROUND(((cost_per_unit - buying_price) / cost_per_unit * 100)::numeric, 1) as margin')
      )
      .where('cost_per_unit', '>', 0)
      .where('buying_price', '>', 0)
      .orderByRaw('margin DESC')
      .limit(10);

    console.log('\n📊 Top 10 Items by New Profit Margin:');
    marginData.forEach(item => {
      console.log(`   - ${item.name}: ${item.margin}% margin (Buy: KES ${item.buying_price}, Sell: KES ${item.cost_per_unit})`);
    });

    console.log('\n✨ Buying price update completed successfully!\n');
    await knex.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating buying prices:', error);
    await knex.destroy();
    process.exit(1);
  }
}

updateBuyingPrices();
