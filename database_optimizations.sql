-- XYZ Hotel POS - Database Performance Optimization Script
-- Run this script in your PostgreSQL database to optimize query performance
-- Estimated execution time: 2-5 minutes

-- ============================================================================
-- 1. CREATE PERFORMANCE INDEXES
-- ============================================================================

-- Index for authentication lookups (staff login)
CREATE INDEX IF NOT EXISTS staff_username_index ON staff(username);

-- Composite index for monitoring queries (6-hour calculations)
CREATE INDEX IF NOT EXISTS orders_created_completed_index ON orders(created_at, completed_at);

-- Index for kitchen display lookups
CREATE INDEX IF NOT EXISTS items_order_id_index ON items(order_id);

-- Indexes for audit log filtering
CREATE INDEX IF NOT EXISTS audit_logs_admin_username_index ON audit_logs(admin_username);
CREATE INDEX IF NOT EXISTS audit_logs_target_username_index ON audit_logs(target_username);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_index ON audit_logs(created_at);

-- Partial index for completed orders (faster queries on non-null values)
CREATE INDEX IF NOT EXISTS orders_completed_at_desc_index ON orders(completed_at DESC) 
  WHERE completed_at IS NOT NULL;

-- Partial index for pending orders (very common filter)
CREATE INDEX IF NOT EXISTS orders_pending_index ON orders(status) 
  WHERE status = 'pending';

-- Composite index for kitchen display status lookups
CREATE INDEX IF NOT EXISTS items_order_id_status_index ON items(order_id, status);

-- ============================================================================
-- 2. UPDATE DATABASE STATISTICS
-- ============================================================================

-- Update query planner statistics (essential for optimizer to use indexes effectively)
ANALYZE orders;
ANALYZE staff;
ANALYZE items;
ANALYZE audit_logs;
ANALYZE inventory_items;

-- ============================================================================
-- 3. OPTIONAL: CREATE METRICS CACHE TABLE
-- ============================================================================

-- Uncomment below to create a metrics cache table for monitoring optimization
-- This prevents expensive recalculations every 30 seconds

CREATE TABLE IF NOT EXISTS metrics_cache (
  id SERIAL PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10, 2),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '5 minutes',
  UNIQUE(metric_type)
);

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Check if indexes were created successfully
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans
FROM pg_stat_user_indexes
WHERE tablename IN ('orders', 'staff', 'items', 'audit_logs')
ORDER BY tablename, indexname;

-- Check database size
SELECT 
  pg_size_pretty(pg_database_size(current_database())) AS "Database Size",
  pg_size_pretty(pg_total_relation_size('orders')) AS "Orders Table Size";

-- Check connection pool status
SELECT 
  datname,
  numbackends,
  pg_size_pretty(pg_database_size(datname)) AS size
FROM pg_database
WHERE datname = current_database();

-- ============================================================================
-- 5. MAINTENANCE COMMANDS (Run weekly)
-- ============================================================================

-- VACUUM ANALYZE - Reclaims space and updates statistics
-- Run this weekly during off-peak hours
-- VACUUM ANALYZE orders;
-- VACUUM ANALYZE staff;
-- VACUUM ANALYZE items;
-- VACUUM ANALYZE audit_logs;

-- ============================================================================
-- 6. PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Monitor cache hit ratio (should be > 99%)
-- SELECT 
--   sum(heap_blks_read) as heap_read, 
--   sum(heap_blks_hit) as heap_hit,
--   sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
-- FROM pg_statio_user_tables
-- WHERE schemaname = 'public';

-- Find slow queries
-- SELECT 
--   mean_exec_time,
--   max_exec_time,
--   calls,
--   query
-- FROM pg_stat_statements
-- ORDER BY mean_exec_time DESC
-- LIMIT 10;

-- ============================================================================
-- 7. NOTES
-- ============================================================================

-- After running this script:
-- 1. Restart your application server for connection pool changes to take effect
-- 2. Monitor database latency in the monitoring dashboard
-- 3. Expected improvement: 500ms+ latency → 200-300ms latency
-- 4. Run VACUUM ANALYZE weekly for continued performance

-- For more details, see PERFORMANCE_OPTIMIZATIONS.md
