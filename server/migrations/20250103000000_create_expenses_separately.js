/**
 * Separate migration for expenses table to avoid transaction issues
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if expenses table already exists
  const hasExpensesTable = await knex.schema.hasTable('expenses');
  if (hasExpensesTable) {
    console.log('✅ Expenses table already exists');
    return;
  }

  console.log('📝 Creating expenses table...');
  
  // Create expenses table
  await knex.schema.createTable('expenses', (table) => {
    table.increments('id').primary();
    table.date('date').notNullable();
    table.text('category').notNullable(); // utilities, maintenance, supplies, salaries, other
    table.text('description').notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.text('vendor');
    table.text('payment_method').defaultTo('cash'); // cash, card, bank_transfer, cheque
    table.text('receipt_number').unique();
    table.text('notes');
    table.integer('created_by').references('staff.id').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  console.log('✅ Expenses table created');

  // Create indexes
  console.log('📑 Creating indexes for expenses table...');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by)');
  
  console.log('✅ Expenses indexes created');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop indexes first
  await knex.schema.raw('DROP INDEX IF EXISTS idx_expenses_created_by');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_expenses_category');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_expenses_date');
  
  // Drop table
  await knex.schema.dropTableIfExists('expenses');
};