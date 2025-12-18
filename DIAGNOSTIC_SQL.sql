-- INVENTORY UPLOAD DIAGNOSTIC SQL QUERIES
-- Run these in your PostgreSQL client (psql, pgAdmin, DBeaver, etc.)
-- Database: pos_mocha_dev
-- User: postgres / postgres

-- ============================================
-- SECTION 1: VERIFY DATABASE CONNECTION
-- ============================================

-- Test connection
SELECT 1 as connection_test;
-- Expected: returns 1

-- Check current user and database
SELECT current_user, current_database();
-- Expected: postgres | pos_mocha_dev

-- ============================================
-- SECTION 2: CHECK TABLE STRUCTURE
-- ============================================

-- Verify inventory_items table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'inventory_items'
) as table_exists;
-- Expected: true

-- Show all columns in inventory_items
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_items' 
ORDER BY ordinal_position;
-- Expected: Should show: id, name, unit, current_stock, minimum_stock, cost_per_unit, 
--           supplier, inventory_type, is_active, created_at, updated_at

-- ============================================
-- SECTION 3: DATA VOLUME CHECKS
-- ============================================

-- Total count
SELECT COUNT(*) as total_items FROM inventory_items;
-- If 0: Nothing was inserted
-- If > 0: Items exist

-- Count by is_active flag
SELECT 
  is_active, 
  COUNT(*) as count 
FROM inventory_items 
GROUP BY is_active
ORDER BY is_active;
-- Expected: Most items should have is_active = true

-- Count null is_active
SELECT COUNT(*) as null_is_active 
FROM inventory_items 
WHERE is_active IS NULL;
-- Expected: 0

-- Count by inventory type
SELECT 
  inventory_type, 
  COUNT(*) as count,
  SUM(current_stock) as total_stock,
  AVG(cost_per_unit) as avg_cost
FROM inventory_items 
GROUP BY inventory_type 
ORDER BY inventory_type;
-- Expected: bar, kitchen, housekeeping, minibar (all lowercase)
-- If uppercase (BAR, KITCHEN): Type normalization failed!

-- ============================================
-- SECTION 4: CHECK YOUR CSV ITEMS SPECIFICALLY
-- ============================================

-- Look for items from your CSV file
SELECT 
  id,
  name,
  inventory_type,
  current_stock,
  cost_per_unit,
  supplier,
  is_active,
  created_at
FROM inventory_items 
WHERE name ILIKE '%STREET%' 
  OR name ILIKE '%WINE%'
  OR name ILIKE '%BALOZI%'
  OR name ILIKE '%BEEFEATER%'
ORDER BY created_at DESC 
LIMIT 20;
-- Expected: Should find items from your CSV

-- ============================================
-- SECTION 5: VERIFY is_active FLAG
-- ============================================

-- Show items with is_active = false (hidden from API)
SELECT 
  id,
  name,
  inventory_type,
  is_active,
  created_at
FROM inventory_items 
WHERE is_active = false 
LIMIT 10;
-- If this returns rows: Items are marked as inactive!

-- ============================================
-- SECTION 6: CHECK DATA TYPES
-- ============================================

-- Verify current_stock and cost_per_unit are numeric
SELECT 
  id,
  name,
  current_stock,
  cost_per_unit,
  CAST(current_stock AS TEXT) as stock_str,
  CAST(cost_per_unit AS TEXT) as cost_str
FROM inventory_items 
LIMIT 5;
-- Expected: Should show numeric values

-- ============================================
-- SECTION 7: VERIFY FOREIGN KEYS
-- ============================================

-- Check if there are any orphaned records (shouldn't be for inventory)
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'inventory_items';
-- Expected: Should show primary key on id

-- ============================================
-- SECTION 8: PERFORMANCE - INDEXES
-- ============================================

-- Check indexes on inventory_items
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'inventory_items';
-- Expected: Should have indexes on inventory_type, is_active, name

-- ============================================
-- SECTION 9: SAMPLE DATA FOR DEBUGGING
-- ============================================

-- Get first 5 records for inspection
SELECT * FROM inventory_items LIMIT 5;

-- Get a specific record by name (adapt to your items)
SELECT * FROM inventory_items 
WHERE name = '4TH STREET RED 750ML' 
LIMIT 1;

-- ============================================
-- SECTION 10: IF ITEMS ARE HIDDEN, FIX THEM
-- ============================================

-- FIX: If items are marked as inactive, activate them
UPDATE inventory_items 
SET is_active = true 
WHERE is_active = false 
  OR is_active IS NULL;

-- Verify fix
SELECT COUNT(*) as active_items 
FROM inventory_items 
WHERE is_active = true;

-- ============================================
-- SECTION 11: IF TYPES ARE WRONG, FIX THEM
-- ============================================

-- Fix: Normalize all types to lowercase
UPDATE inventory_items 
SET inventory_type = LOWER(inventory_type) 
WHERE inventory_type IS NOT NULL;

-- Verify fix
SELECT DISTINCT inventory_type FROM inventory_items;
-- Expected: bar, kitchen, housekeeping, minibar (all lowercase)

-- ============================================
-- SECTION 12: RESET BAD DATA IF NEEDED
-- ============================================

-- WARNING: Only run if needed!
-- Delete all items and start fresh
-- DELETE FROM inventory_items;

-- Check how many you're about to delete
SELECT COUNT(*) FROM inventory_items;

-- ============================================
-- SECTION 13: SIMULATE API QUERY
-- ============================================

-- This is what the API does (role: admin)
-- Should return all active items
SELECT 
  id,
  name,
  unit,
  current_stock,
  minimum_stock,
  cost_per_unit,
  supplier,
  inventory_type,
  is_active,
  created_at,
  updated_at
FROM inventory_items 
WHERE is_active = true
ORDER BY name ASC;

-- This is what the API does (role: receptionist, filtered by type)
-- Should return only bar, housekeeping, minibar
SELECT * FROM inventory_items 
WHERE is_active = true 
  AND inventory_type IN ('bar', 'housekeeping', 'minibar')
ORDER BY name ASC;

-- ============================================
-- SECTION 14: DATABASE HEALTH CHECK
-- ============================================

-- Check for table bloat
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename = 'inventory_items';

-- ============================================
-- INTERPRETATION GUIDE
-- ============================================

/*
If you run these queries and see:

✅ ALL DATA PRESENT, is_active=true, types=lowercase
   → Database is CORRECT
   → Issue is in FRONTEND or API filtering
   → Check browser console for errors
   → Refresh page with Ctrl+Shift+R

⚠️ is_active = false for uploaded items
   → RUN: UPDATE inventory_items SET is_active = true WHERE is_active IS NULL OR is_active = false;
   → Refresh page

⚠️ Types are uppercase (BAR, KITCHEN)
   → RUN: UPDATE inventory_items SET inventory_type = LOWER(inventory_type);
   → Refresh page

❌ ZERO items in inventory_items table
   → Upload DID NOT insert into database
   → Check server logs for errors
   → Re-build and restart server
   → Try uploading again

❌ Some items inserted but many missing
   → CSV parsing failed for some rows
   → Check server logs for parse errors
   → Check CSV file format
*/
