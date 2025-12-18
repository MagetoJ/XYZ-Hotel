/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if suppliers table exists, if not create it
  const hasSuppliers = await knex.schema.hasTable('suppliers');
  if (!hasSuppliers) {
    await knex.schema.createTable('suppliers', (table) => {
      table.increments('id').primary();
      table.text('name').notNullable().unique();
      table.text('contact_person');
      table.text('phone');
      table.text('email');
      table.text('address');
      table.text('payment_terms');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });
  }

  // Check if purchase_orders table exists
  const hasPurchaseOrders = await knex.schema.hasTable('purchase_orders');
  if (!hasPurchaseOrders) {
    await knex.schema.createTable('purchase_orders', (table) => {
      table.increments('id').primary();
      table.text('po_number').notNullable().unique();
      table.integer('supplier_id').notNullable().references('suppliers.id');
      table.date('order_date').notNullable();
      table.date('expected_delivery_date');
      table.date('actual_delivery_date');
      table.text('status').defaultTo('pending');
      table.decimal('total_amount', 12, 2);
      table.text('notes');
      table.integer('created_by').references('staff.id');
      table.timestamps(true, true);
    });
  }

  // Check if purchase_order_items table exists
  const hasPurchaseOrderItems = await knex.schema.hasTable('purchase_order_items');
  if (!hasPurchaseOrderItems) {
    await knex.schema.createTable('purchase_order_items', (table) => {
      table.increments('id').primary();
      table.integer('purchase_order_id').notNullable().references('purchase_orders.id').onDelete('CASCADE');
      table.integer('inventory_item_id').notNullable().references('inventory_items.id');
      table.integer('quantity_ordered').notNullable();
      table.integer('quantity_received').defaultTo(0);
      table.decimal('unit_cost', 10, 2).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Check if recipes table exists
  const hasRecipes = await knex.schema.hasTable('recipes');
  if (!hasRecipes) {
    await knex.schema.createTable('recipes', (table) => {
      table.increments('id').primary();
      table.integer('product_id').notNullable().references('products.id');
      table.text('name').notNullable();
      table.text('description');
      table.decimal('yield_quantity', 10, 2).defaultTo(1);
      table.text('yield_unit').defaultTo('unit');
      table.boolean('is_active').defaultTo(true);
      table.integer('created_by').references('staff.id');
      table.timestamps(true, true);
    });
  }

  // Check if recipe_ingredients table exists
  const hasRecipeIngredients = await knex.schema.hasTable('recipe_ingredients');
  if (!hasRecipeIngredients) {
    await knex.schema.createTable('recipe_ingredients', (table) => {
      table.increments('id').primary();
      table.integer('recipe_id').notNullable().references('recipes.id').onDelete('CASCADE');
      table.integer('inventory_item_id').notNullable().references('inventory_items.id');
      table.decimal('quantity_required', 10, 2).notNullable();
      table.text('unit').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Check if wastage_logs table exists
  const hasWastageLogs = await knex.schema.hasTable('wastage_logs');
  if (!hasWastageLogs) {
    await knex.schema.createTable('wastage_logs', (table) => {
      table.increments('id').primary();
      table.integer('inventory_item_id').notNullable().references('inventory_items.id');
      table.decimal('quantity_wasted', 10, 2).notNullable();
      table.text('reason').notNullable();
      table.text('notes');
      table.date('waste_date').notNullable();
      table.integer('logged_by').references('staff.id');
      table.timestamps(true, true);
    });
  }

  // Check if stock_transfers table exists
  const hasStockTransfers = await knex.schema.hasTable('stock_transfers');
  if (!hasStockTransfers) {
    await knex.schema.createTable('stock_transfers', (table) => {
      table.increments('id').primary();
      table.text('transfer_number').notNullable().unique();
      table.integer('inventory_item_id').notNullable().references('inventory_items.id');
      table.text('from_location');
      table.text('to_location');
      table.integer('quantity_transferred').notNullable();
      table.text('status').defaultTo('pending');
      table.date('transfer_date').notNullable();
      table.date('received_date');
      table.integer('requested_by').references('staff.id');
      table.integer('received_by').references('staff.id');
      table.text('notes');
      table.timestamps(true, true);
    });
  }

  // Check if inventory_audits table exists
  const hasInventoryAudits = await knex.schema.hasTable('inventory_audits');
  if (!hasInventoryAudits) {
    await knex.schema.createTable('inventory_audits', (table) => {
      table.increments('id').primary();
      table.text('audit_number').notNullable().unique();
      table.date('audit_date').notNullable();
      table.timestamp('start_time');
      table.timestamp('end_time');
      table.text('status').defaultTo('in_progress');
      table.text('notes');
      table.integer('created_by').references('staff.id');
      table.timestamps(true, true);
    });
  }

  // Check if audit_line_items table exists
  const hasAuditLineItems = await knex.schema.hasTable('audit_line_items');
  if (!hasAuditLineItems) {
    await knex.schema.createTable('audit_line_items', (table) => {
      table.increments('id').primary();
      table.integer('inventory_audit_id').notNullable().references('inventory_audits.id').onDelete('CASCADE');
      table.integer('inventory_item_id').notNullable().references('inventory_items.id');
      table.decimal('system_quantity', 10, 2);
      table.decimal('physical_quantity', 10, 2);
      table.decimal('variance', 10, 2);
      table.text('variance_reason');
      table.text('notes');
      table.integer('audited_by').references('staff.id');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Create indexes for better performance (with error handling)
  try {
    if (await knex.schema.hasTable('suppliers')) {
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)`).catch(() => {});
    }
    
    if (await knex.schema.hasTable('purchase_orders')) {
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id)`).catch(() => {});
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status)`).catch(() => {});
    }
    
    if (await knex.schema.hasTable('recipes')) {
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id)`).catch(() => {});
    }
    
    if (await knex.schema.hasTable('recipe_ingredients')) {
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id)`).catch(() => {});
    }
    
    if (await knex.schema.hasTable('wastage_logs')) {
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_wastage_logs_item_id ON wastage_logs(inventory_item_id)`).catch(() => {});
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_wastage_logs_date ON wastage_logs(waste_date)`).catch(() => {});
    }
    
    if (await knex.schema.hasTable('stock_transfers')) {
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_stock_transfers_item_id ON stock_transfers(inventory_item_id)`).catch(() => {});
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status)`).catch(() => {});
    }
    
    if (await knex.schema.hasTable('inventory_audits')) {
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_inventory_audits_date ON inventory_audits(audit_date)`).catch(() => {});
    }
    
    if (await knex.schema.hasTable('audit_line_items')) {
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_audit_line_items_audit_id ON audit_line_items(inventory_audit_id)`).catch(() => {});
    }
  } catch (err) {
    console.warn('Index creation encountered warnings (non-blocking):', err);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('audit_line_items');
  await knex.schema.dropTableIfExists('inventory_audits');
  await knex.schema.dropTableIfExists('stock_transfers');
  await knex.schema.dropTableIfExists('wastage_logs');
  await knex.schema.dropTableIfExists('recipe_ingredients');
  await knex.schema.dropTableIfExists('recipes');
  await knex.schema.dropTableIfExists('purchase_order_items');
  await knex.schema.dropTableIfExists('purchase_orders');
  await knex.schema.dropTableIfExists('suppliers');
};