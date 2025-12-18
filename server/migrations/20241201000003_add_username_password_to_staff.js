/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  return knex.raw(`
    -- Add username and password columns to staff table if they don't exist
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS password TEXT;
    
    -- Update existing records with default username and password
    UPDATE staff SET 
      username = CASE 
        WHEN role = 'admin' THEN 'admin_' || id::text
        ELSE LOWER(REPLACE(name, ' ', '')) || '_' || id::text
      END,
      password = CASE 
        WHEN role = 'admin' THEN 'admin123'
        ELSE 'password123'
      END
    WHERE username IS NULL OR username = '';
    
    -- Make username required
    ALTER TABLE staff ALTER COLUMN username SET NOT NULL;
    
    -- Drop existing unique constraint if it exists
    ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_username_unique;
    
    -- Make password required
    ALTER TABLE staff ALTER COLUMN password SET NOT NULL;
    
    -- Create indexes for performance
    DROP INDEX IF EXISTS idx_staff_username;
    DROP INDEX IF EXISTS idx_staff_active;
    CREATE INDEX idx_staff_username ON staff(username);
    CREATE INDEX idx_staff_active ON staff(is_active);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    -- Remove indexes
    DROP INDEX IF EXISTS idx_staff_username;
    DROP INDEX IF EXISTS idx_staff_active;
    
    -- Remove constraints
    ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_username_unique;
    
    -- Remove columns
    ALTER TABLE staff DROP COLUMN IF EXISTS username;
    ALTER TABLE staff DROP COLUMN IF EXISTS password;
  `);
};