/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    -- Expenses table for tracking business expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      category TEXT NOT NULL, -- utilities, maintenance, supplies, salaries, other
      description TEXT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      vendor TEXT,
      payment_method TEXT DEFAULT 'cash', -- cash, card, bank_transfer, cheque
      receipt_number TEXT UNIQUE,
      notes TEXT,
      created_by INTEGER REFERENCES staff(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Product Returns table
    CREATE TABLE IF NOT EXISTS product_returns (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id),
      product_id INTEGER REFERENCES products(id),
      quantity_returned INTEGER NOT NULL,
      reason TEXT NOT NULL, -- damaged, expired, wrong_item, customer_request, quality_issue
      refund_amount DECIMAL(10, 2),
      notes TEXT,
      created_by INTEGER REFERENCES staff(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit logs for expenses (already exists from order auditing, but we'll extend tracking)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL, -- order, product_return, expense, inventory, etc.
      entity_id INTEGER,
      action TEXT NOT NULL, -- create, update, delete
      old_values JSONB,
      new_values JSONB,
      changed_by INTEGER REFERENCES staff(id),
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
    CREATE INDEX IF NOT EXISTS idx_product_returns_order_id ON product_returns(order_id);
    CREATE INDEX IF NOT EXISTS idx_product_returns_product_id ON product_returns(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_returns_created_by ON product_returns(created_by);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS product_returns;
    DROP TABLE IF EXISTS expenses;
  `);
};