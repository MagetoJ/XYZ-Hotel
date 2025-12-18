import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific configuration
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 Database URL configured: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);

// Enhanced database configuration with better environment detection
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    console.log('🗄️ Using DATABASE_URL connection');
    return {
      client: 'pg',
      connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      },
      pool: {
        min: 0,
        max: 5,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 10000,
        reapIntervalMillis: 2000,
      },
      debug: isDevelopment,
    };
  }
  return {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'pos_mocha_dev',
      port: parseInt(process.env.DB_PORT || '5432'),
    },
    debug: isDevelopment,
    };
};

const db = knex(getDatabaseConfig());

// Enhanced connection testing with retry logic
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await db.raw('SELECT 1+1 as result');
      console.log('✅ Database connected successfully');
      if (isProduction) {
        console.log('🗄️ Production database connection established');
      }
      return true;
    } catch (err: any) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, err.message);
      if (i === retries - 1) {
        console.error('💥 All database connection attempts failed');
        if (isProduction) {
          console.error('🚨 Production database connection failed - check DATABASE_URL');
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }
  }
  return false;
};

const ensureCriticalTables = async () => {
  const ensureColumn = async (
    table: string,
    column: string,
    alter: (table: any) => void,
    message: string
  ) => {
    const exists = await db.schema.hasColumn(table, column);
    if (!exists) {
      await db.schema.alterTable(table, alter);
      console.log(message);
    }
  };

  try {
    const hasSuppliers = await db.schema.hasTable('suppliers');
    if (!hasSuppliers) {
      await db.schema.createTable('suppliers', (table) => {
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
      console.log('🛠️ Created missing suppliers table');
    }

    const hasPurchaseOrders = await db.schema.hasTable('purchase_orders');
    if (!hasPurchaseOrders) {
      await db.schema.createTable('purchase_orders', (table) => {
        table.increments('id').primary();
        table.text('po_number').notNullable().unique();
        table.integer('supplier_id').notNullable().references('suppliers.id');
        table.date('order_date').notNullable();
        table.date('expected_delivery_date');
        table.date('actual_delivery_date');
        table.text('status').defaultTo('pending');
        table.decimal('total_amount', 12, 2).defaultTo(0);
        table.text('notes');
        table.integer('created_by').references('staff.id');
        table.timestamps(true, true);
      });
      console.log('🛠️ Created missing purchase_orders table');
    } else {
      await ensureColumn('purchase_orders', 'po_number', (table) => table.text('po_number'), '🛠️ Added purchase_orders.po_number column');
      await ensureColumn('purchase_orders', 'order_number', (table) => table.text('order_number'), '🛠️ Added purchase_orders.order_number column');
      await ensureColumn('purchase_orders', 'supplier_id', (table) => table.integer('supplier_id').references('suppliers.id'), '🛠️ Added purchase_orders.supplier_id column');
      await ensureColumn('purchase_orders', 'supplier', (table) => table.text('supplier'), '🛠️ Added purchase_orders.supplier column');
      await ensureColumn('purchase_orders', 'order_date', (table) => table.date('order_date'), '🛠️ Added purchase_orders.order_date column');
      await ensureColumn('purchase_orders', 'expected_delivery_date', (table) => table.date('expected_delivery_date'), '🛠️ Added purchase_orders.expected_delivery_date column');
      await ensureColumn('purchase_orders', 'actual_delivery_date', (table) => table.date('actual_delivery_date'), '🛠️ Added purchase_orders.actual_delivery_date column');
      await ensureColumn('purchase_orders', 'status', (table) => table.text('status').defaultTo('pending'), '🛠️ Added purchase_orders.status column');
      await ensureColumn('purchase_orders', 'total_amount', (table) => table.decimal('total_amount', 12, 2).defaultTo(0), '🛠️ Added purchase_orders.total_amount column');
      await ensureColumn('purchase_orders', 'notes', (table) => table.text('notes'), '🛠️ Added purchase_orders.notes column');
      await ensureColumn('purchase_orders', 'created_by', (table) => table.integer('created_by').references('staff.id'), '🛠️ Added purchase_orders.created_by column');
      await ensureColumn('purchase_orders', 'approved_by', (table) => table.integer('approved_by').references('staff.id'), '🛠️ Added purchase_orders.approved_by column');
      await ensureColumn('purchase_orders', 'received_by', (table) => table.integer('received_by').references('staff.id'), '🛠️ Added purchase_orders.received_by column');
      await ensureColumn('purchase_orders', 'created_at', (table) => table.timestamp('created_at').defaultTo(db.fn.now()), '🛠️ Added purchase_orders.created_at column');
      await ensureColumn('purchase_orders', 'updated_at', (table) => table.timestamp('updated_at').defaultTo(db.fn.now()), '🛠️ Added purchase_orders.updated_at column');

      const missingNumbers = await db('purchase_orders').whereNull('po_number').orWhere('po_number', '');
      if (missingNumbers.length > 0) {
        await db.raw(`UPDATE purchase_orders SET po_number = CONCAT('PO', LPAD(id::text, 6, '0')) WHERE po_number IS NULL OR po_number = ''`);
      }
      await db('purchase_orders').whereNull('status').update({ status: 'pending' }).catch(() => {});
      await db('purchase_orders').whereNull('total_amount').update({ total_amount: 0 }).catch(() => {});

      if (await db.schema.hasColumn('purchase_orders', 'order_number')) {
        await db('purchase_orders')
          .whereNull('order_number')
          .orWhere('order_number', '')
          .update({ order_number: db.raw(`COALESCE(po_number, CONCAT('PO', LPAD(id::text, 6, '0')))` ) })
          .catch(() => {});
      }

      if (await db.schema.hasColumn('purchase_orders', 'supplier')) {
        await db.raw(`UPDATE purchase_orders SET supplier = COALESCE((SELECT name FROM suppliers WHERE suppliers.id = purchase_orders.supplier_id), 'Unknown Supplier') WHERE supplier IS NULL OR supplier = ''`)
          .catch(() => {});
      }
    }

    const hasPurchaseOrderItems = await db.schema.hasTable('purchase_order_items');
    if (!hasPurchaseOrderItems) {
      await db.schema.createTable('purchase_order_items', (table) => {
        table.increments('id').primary();
        table.integer('purchase_order_id').notNullable().references('purchase_orders.id').onDelete('CASCADE');
        table.integer('inventory_item_id').references('inventory_items.id');
        table.integer('item_id').references('inventory_items.id');
        table.decimal('quantity', 10, 2).notNullable().defaultTo(0);
        table.integer('quantity_ordered');
        table.decimal('unit_price', 10, 2).notNullable().defaultTo(0);
        table.decimal('unit_cost', 10, 2).notNullable().defaultTo(0);
        table.decimal('total_price', 10, 2).notNullable().defaultTo(0);
        table.decimal('received_quantity', 10, 2).notNullable().defaultTo(0);
        table.integer('quantity_received').defaultTo(0);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('🛠️ Created missing purchase_order_items table');
    } else {
      await ensureColumn('purchase_order_items', 'purchase_order_id', (table) => table.integer('purchase_order_id').references('purchase_orders.id'), '🛠️ Added purchase_order_items.purchase_order_id column');
      await ensureColumn('purchase_order_items', 'inventory_item_id', (table) => table.integer('inventory_item_id').references('inventory_items.id'), '🛠️ Added purchase_order_items.inventory_item_id column');
      await ensureColumn('purchase_order_items', 'item_id', (table) => table.integer('item_id').references('inventory_items.id'), '🛠️ Added purchase_order_items.item_id column');
      await ensureColumn('purchase_order_items', 'quantity_ordered', (table) => table.integer('quantity_ordered'), '🛠️ Added purchase_order_items.quantity_ordered column');
      await ensureColumn('purchase_order_items', 'quantity', (table) => table.decimal('quantity', 10, 2).defaultTo(0), '🛠️ Added purchase_order_items.quantity column');
      await ensureColumn('purchase_order_items', 'quantity_received', (table) => table.integer('quantity_received').defaultTo(0), '🛠️ Added purchase_order_items.quantity_received column');
      await ensureColumn('purchase_order_items', 'received_quantity', (table) => table.decimal('received_quantity', 10, 2).defaultTo(0), '🛠️ Added purchase_order_items.received_quantity column');
      await ensureColumn('purchase_order_items', 'unit_cost', (table) => table.decimal('unit_cost', 10, 2), '🛠️ Added purchase_order_items.unit_cost column');
      await ensureColumn('purchase_order_items', 'unit_price', (table) => table.decimal('unit_price', 10, 2), '🛠️ Added purchase_order_items.unit_price column');
      await ensureColumn('purchase_order_items', 'total_price', (table) => table.decimal('total_price', 10, 2), '🛠️ Added purchase_order_items.total_price column');
      await ensureColumn('purchase_order_items', 'created_at', (table) => table.timestamp('created_at').defaultTo(db.fn.now()), '🛠️ Added purchase_order_items.created_at column');
      await ensureColumn('purchase_order_items', 'updated_at', (table) => table.timestamp('updated_at').defaultTo(db.fn.now()), '🛠️ Added purchase_order_items.updated_at column');

      await db('purchase_order_items').whereNull('inventory_item_id').update({ inventory_item_id: db.raw('item_id') }).catch(() => {});
      await db('purchase_order_items').whereNull('item_id').update({ item_id: db.raw('inventory_item_id') }).catch(() => {});
      await db.raw('UPDATE purchase_order_items SET quantity = COALESCE(quantity, quantity_ordered::numeric, 0)').catch(() => {});
      await db.raw('UPDATE purchase_order_items SET quantity_ordered = COALESCE(quantity_ordered, GREATEST(0, FLOOR(quantity)))').catch(() => {});
      await db.raw('UPDATE purchase_order_items SET unit_price = COALESCE(unit_price, unit_cost, 0)').catch(() => {});
      await db.raw('UPDATE purchase_order_items SET unit_cost = COALESCE(unit_cost, unit_price, 0)').catch(() => {});
      await db.raw('UPDATE purchase_order_items SET total_price = COALESCE(total_price, COALESCE(unit_cost, unit_price, 0) * COALESCE(quantity, quantity_ordered, 0))').catch(() => {});
      await db.raw('UPDATE purchase_order_items SET received_quantity = COALESCE(received_quantity, quantity_received::numeric, 0)').catch(() => {});
      await db('purchase_order_items').whereNull('quantity_received').update({ quantity_received: 0 }).catch(() => {});
    }

    const hasInventoryLog = await db.schema.hasTable('inventory_log');
    if (!hasInventoryLog) {
      await db.schema.createTable('inventory_log', (table) => {
        table.increments('id').primary();
        table.integer('inventory_item_id').references('inventory_items.id');
        table.text('action').notNullable();
        table.decimal('quantity_change', 12, 2).notNullable();
        table.integer('reference_id');
        table.text('reference_type');
        table.integer('logged_by').references('staff.id');
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('🛠️ Created missing inventory_log table');
    }
  } catch (err) {
    console.error('❌ Failed to ensure critical tables exist:', err);
  }
};

// Test connection on startup
testConnection().then(() => ensureCriticalTables()).catch(() => ensureCriticalTables());

export default db;