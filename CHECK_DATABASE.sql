-- Check if items are in the database
SELECT COUNT(*) as total_items, COUNT(CASE WHEN is_active = true THEN 1 END) as active_items FROM inventory_items;

-- Check items by type
SELECT inventory_type, COUNT(*) as count FROM inventory_items WHERE is_active = true GROUP BY inventory_type;

-- Show sample items
SELECT id, name, inventory_type, current_stock, is_active FROM inventory_items LIMIT 10;
