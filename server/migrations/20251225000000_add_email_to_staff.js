/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    -- Add email field to staff table for password reset functionality
    ALTER TABLE staff ADD COLUMN email TEXT;
    
    -- Create index for email lookups
    CREATE INDEX idx_staff_email ON staff(email);
    
    -- Update existing staff with sample email addresses for testing
    UPDATE staff SET email = LOWER(name) || '@mariahavens.com' WHERE email IS NULL;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    DROP INDEX IF EXISTS idx_staff_email;
    ALTER TABLE staff DROP COLUMN IF EXISTS email;
  `);
};