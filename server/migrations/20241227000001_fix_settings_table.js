/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    -- Add type column if it doesn't exist
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='settings' AND column_name='type') THEN
            ALTER TABLE settings ADD COLUMN type VARCHAR(20) DEFAULT 'string';
        END IF;
    END $$;

    -- Update existing settings to have proper types and keys
    INSERT INTO settings (key, value, type, description, created_at, updated_at) VALUES
      ('business_name', 'Maria Havens POS', 'string', 'Business name for receipts', NOW(), NOW()),
      ('business_address', 'Hotel & Restaurant Address', 'string', 'Business address for receipts', NOW(), NOW()),
      ('business_phone', '+254-XXX-XXXX', 'string', 'Business phone number', NOW(), NOW()),
      ('currency_symbol', 'KES', 'string', 'Currency symbol', NOW(), NOW()),
      ('tax_rate_percentage', '16', 'number', 'Tax rate percentage', NOW(), NOW()),
      ('service_charge_percentage', '10', 'number', 'Service charge percentage', NOW(), NOW()),
      ('receipt_footer_message', 'Thank you for your visit! Please come again', 'string', 'Footer message on receipts', NOW(), NOW())
    ON CONFLICT (key) DO UPDATE SET
      type = EXCLUDED.type,
      updated_at = NOW();

    -- Update existing records to have proper types
    UPDATE settings SET type = 'number' WHERE key IN ('tax_rate', 'service_charge', 'max_tables', 'max_rooms', 'tax_rate_percentage', 'service_charge_percentage');
    UPDATE settings SET type = 'string' WHERE key IN ('restaurant_name', 'restaurant_address', 'restaurant_phone', 'currency', 'business_name', 'business_address', 'business_phone', 'currency_symbol', 'receipt_footer_message');
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    -- Remove type column
    ALTER TABLE settings DROP COLUMN IF EXISTS type;
    
    -- Remove new settings
    DELETE FROM settings WHERE key IN ('business_name', 'business_address', 'business_phone', 'currency_symbol', 'tax_rate_percentage', 'service_charge_percentage', 'receipt_footer_message');
  `);
};