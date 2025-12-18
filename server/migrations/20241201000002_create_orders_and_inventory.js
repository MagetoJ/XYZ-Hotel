/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    -- Orders table
    CREATE TABLE orders (
      id SERIAL PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      order_type TEXT NOT NULL, -- dine_in, takeaway, delivery, room_service
      table_id INTEGER,
      room_id INTEGER,
      customer_name TEXT,
      customer_phone TEXT,
      staff_id INTEGER,
      status TEXT DEFAULT 'pending', -- pending, confirmed, preparing, ready, completed, cancelled
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      service_charge REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'pending', -- pending, partial, paid, refunded
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Order items
    CREATE TABLE order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'pending', -- pending, preparing, ready, served
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Order item variations
    CREATE TABLE order_item_variations (
      id SERIAL PRIMARY KEY,
      order_item_id INTEGER NOT NULL,
      variation_id INTEGER NOT NULL,
      price_modifier REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Payments
    CREATE TABLE payments (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL, -- cash, card, mobile_money, room_charge
      amount REAL NOT NULL,
      reference_number TEXT,
      status TEXT DEFAULT 'completed', -- pending, completed, failed, refunded
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Inventory
    CREATE TABLE inventory_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      current_stock REAL DEFAULT 0,
      minimum_stock REAL DEFAULT 0,
      cost_per_unit REAL DEFAULT 0,
      supplier TEXT,
      inventory_type TEXT DEFAULT 'kitchen', -- kitchen, bar, housekeeping, minibar
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Maintenance requests table
    CREATE TABLE maintenance_requests (
      id SERIAL PRIMARY KEY,
      room_id INTEGER,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
      status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
      assigned_to INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_orders_status ON orders(status);
    CREATE INDEX idx_orders_staff ON orders(staff_id);
    CREATE INDEX idx_orders_created_at ON orders(created_at);
    CREATE INDEX idx_order_items_order ON order_items(order_id);
    CREATE INDEX idx_order_items_status ON order_items(status);
    CREATE INDEX idx_payments_order ON payments(order_id);
    CREATE INDEX idx_inventory_type ON inventory_items(inventory_type);
    CREATE INDEX idx_maintenance_requests_room ON maintenance_requests(room_id);
    CREATE INDEX idx_maintenance_requests_status ON maintenance_requests(status);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    DROP TABLE IF EXISTS maintenance_requests;
    DROP TABLE IF EXISTS inventory_items;
    DROP TABLE IF EXISTS payments;
    DROP TABLE IF EXISTS order_item_variations;
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
  `);
};