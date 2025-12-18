/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  try {
    // Create user_sessions table
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES staff(id),
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        logout_time TIMESTAMP,
        session_token TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create password_reset_tokens table
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES staff(id),
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add allowed_roles column if it doesn't exist
    const columnExists = await knex.raw(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'allowed_roles'
      )`
    );
    
    if (!columnExists.rows[0].exists) {
      await knex.raw(`
        ALTER TABLE inventory_items 
        ADD COLUMN allowed_roles TEXT[] DEFAULT ARRAY['admin', 'manager'];
      `);
    }

    // Update existing inventory items with proper role permissions
    await knex.raw(`
      UPDATE inventory_items 
      SET allowed_roles = ARRAY['admin', 'manager', 'kitchen_staff'] 
      WHERE inventory_type = 'kitchen' AND allowed_roles IS NULL;
    `);

    await knex.raw(`
      UPDATE inventory_items 
      SET allowed_roles = ARRAY['admin', 'manager', 'receptionist'] 
      WHERE inventory_type IN ('bar', 'housekeeping', 'minibar') AND allowed_roles IS NULL;
    `);

    // Create indexes
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_orders_waiter ON orders(staff_id)`).catch(() => {});
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)`).catch(() => {});
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active)`).catch(() => {});
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id)`).catch(() => {});
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token)`).catch(() => {});
    
    // Create or replace the view
    await knex.raw(`
      CREATE OR REPLACE VIEW daily_sales_by_staff AS
      SELECT 
        s.id as staff_id,
        s.name as staff_name,
        s.role as staff_role,
        DATE(o.created_at) as sales_date,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_sales,
        SUM(o.service_charge) as total_service_charge
      FROM staff s
      LEFT JOIN orders o ON s.id = o.staff_id AND o.status = 'completed'
      GROUP BY s.id, s.name, s.role, DATE(o.created_at);
    `).catch(() => {});

    // Create GIN index on allowed_roles if column exists
    const hasAllowedRoles = await knex.raw(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'allowed_roles'
      )`
    );
    
    if (hasAllowedRoles.rows[0].exists) {
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_inventory_roles ON inventory_items USING gin(allowed_roles)`).catch(() => {});
    }
  } catch (err) {
    console.warn('Migration encountered warnings:', err.message);
    throw err;
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    DROP VIEW IF EXISTS daily_sales_by_staff;
    DROP INDEX IF EXISTS idx_inventory_roles;
    DROP INDEX IF EXISTS idx_password_reset_token;
    DROP INDEX IF EXISTS idx_password_reset_user;
    DROP INDEX IF EXISTS idx_user_sessions_active;
    DROP INDEX IF EXISTS idx_user_sessions_user;
    DROP INDEX IF EXISTS idx_orders_waiter;
    
    ALTER TABLE inventory_items DROP COLUMN IF EXISTS allowed_roles;
    
    DROP TABLE IF EXISTS password_reset_tokens;
    DROP TABLE IF EXISTS user_sessions;
  `);
};