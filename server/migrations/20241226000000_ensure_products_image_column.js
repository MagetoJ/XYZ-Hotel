/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    -- Ensure products table has image_url column
    -- This migration is idempotent - it won't fail if column already exists
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='products' AND column_name='image_url'
      ) THEN
        ALTER TABLE products ADD COLUMN image_url TEXT;
      END IF;
    END $$;

    -- Ensure inventory_items table has image_url column
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='inventory_items' AND column_name='image_url'
      ) THEN
        ALTER TABLE inventory_items ADD COLUMN image_url TEXT;
      END IF;
    END $$;

    -- Ensure rooms table has image_url column for room photos
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='rooms' AND column_name='image_url'
      ) THEN
        ALTER TABLE rooms ADD COLUMN image_url TEXT;
      END IF;
    END $$;

    -- Add indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_products_image_url ON products(image_url);
    CREATE INDEX IF NOT EXISTS idx_inventory_items_image_url ON inventory_items(image_url);
    CREATE INDEX IF NOT EXISTS idx_rooms_image_url ON rooms(image_url);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    -- Remove indexes
    DROP INDEX IF EXISTS idx_products_image_url;
    DROP INDEX IF EXISTS idx_inventory_items_image_url;
    DROP INDEX IF EXISTS idx_rooms_image_url;
    
    -- Note: We don't drop the image_url columns in down migration
    -- to prevent data loss in production deployments
  `);
};