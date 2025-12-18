/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Insert default settings
    INSERT INTO settings (key, value, description) VALUES
      ('restaurant_name', 'Maria Havens', 'Restaurant name'),
      ('restaurant_address', 'Your Restaurant Address', 'Restaurant address'),
      ('restaurant_phone', '+1234567890', 'Restaurant phone number'),
      ('tax_rate', '10', 'Tax rate percentage'),
      ('service_charge', '0', 'Service charge percentage'),
      ('currency', 'USD', 'Currency symbol'),
      ('max_tables', '20', 'Maximum number of tables'),
      ('max_rooms', '50', 'Maximum number of rooms')
    ON CONFLICT (key) DO NOTHING;

    CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    DROP TABLE IF EXISTS settings;
  `);
};