/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    INSERT INTO settings (key, value, type, description, created_at, updated_at) VALUES
      ('enable_mobile_money', 'true', 'boolean', 'Enable mobile money payments', NOW(), NOW()),
      ('mobile_money_paybill', '123456', 'string', 'M-Pesa Paybill number', NOW(), NOW()),
      ('mobile_money_account_name', 'XYZ HOTEL', 'string', 'Display name for mobile payments', NOW(), NOW()),
      ('enable_m_pesa', 'true', 'boolean', 'Enable M-Pesa payments', NOW(), NOW()),
      ('enable_airtel_money', 'false', 'boolean', 'Enable Airtel Money payments', NOW(), NOW())
    ON CONFLICT (key) DO NOTHING;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    DELETE FROM settings WHERE key IN ('enable_mobile_money', 'mobile_money_paybill', 'mobile_money_account_name', 'enable_m_pesa', 'enable_airtel_money');
  `);
};
