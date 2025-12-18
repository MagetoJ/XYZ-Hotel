/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    -- Staff/Users table
    CREATE TABLE staff (
      id SERIAL PRIMARY KEY,
      employee_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL, -- admin, manager, cashier, waiter, kitchen_staff, delivery, receptionist, housekeeping
      pin TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Tables for restaurant
    CREATE TABLE tables (
      id SERIAL PRIMARY KEY,
      table_number TEXT NOT NULL UNIQUE,
      capacity INTEGER NOT NULL,
      status TEXT DEFAULT 'available', -- available, occupied, reserved, cleaning
      x_position REAL,
      y_position REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Hotel rooms
    CREATE TABLE rooms (
      id SERIAL PRIMARY KEY,
      room_number TEXT NOT NULL UNIQUE,
      room_type TEXT NOT NULL,
      status TEXT DEFAULT 'vacant', -- vacant, occupied, reserved, maintenance, cleaning
      guest_name TEXT,
      check_in_date DATE,
      check_out_date DATE,
      rate REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Menu categories
    CREATE TABLE categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Menu items/products
    CREATE TABLE products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      cost REAL,
      is_available BOOLEAN DEFAULT true,
      is_active BOOLEAN DEFAULT true,
      image_url TEXT,
      preparation_time INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Product variations (sizes, add-ons)
    CREATE TABLE product_variations (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      price_modifier REAL DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_products_category ON products(category_id);
    CREATE INDEX idx_product_variations_product ON product_variations(product_id);
    CREATE INDEX idx_staff_employee_id ON staff(employee_id);
    CREATE INDEX idx_tables_status ON tables(status);
    CREATE INDEX idx_rooms_status ON rooms(status);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    DROP TABLE IF EXISTS product_variations;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS rooms;
    DROP TABLE IF EXISTS tables;
    DROP TABLE IF EXISTS staff;
  `);
};