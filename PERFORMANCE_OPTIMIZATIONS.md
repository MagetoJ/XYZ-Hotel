# Database Performance Optimizations

## Summary of Changes

This document outlines the performance optimizations implemented for the XYZ Hotel POS system to address database latency and monitoring query efficiency.

---

## 1. Connection Pool Optimization ✅

**File Modified:** `server/src/db.ts`

### Changes:
- **Min connections:** 0 → **2** (ensures minimum pool size)
- **Max connections:** 5 → **10** (allows more concurrent queries)
- **Idle timeout:** 10000ms → **30000ms** (keeps connections alive longer)
- **Reap interval:** 2000ms → **1000ms** (faster cleanup of dead connections)
- **Added connection validation** (checks connection health before reuse)

### Impact:
- Reduces connection wait times under load
- Prevents connection exhaustion with monitoring displays
- Better handling of concurrent requests from dashboard + monitoring + kitchen displays

---

## 2. Database Indexes (MANUAL - Run in PostgreSQL)

Execute these SQL queries in your PostgreSQL database to optimize query performance:

```sql
-- Create indexes for frequently accessed columns
CREATE INDEX IF NOT EXISTS staff_username_index ON staff(username);
CREATE INDEX IF NOT EXISTS orders_created_completed_index ON orders(created_at, completed_at);
CREATE INDEX IF NOT EXISTS items_order_id_index ON items(order_id);
CREATE INDEX IF NOT EXISTS audit_logs_admin_username_index ON audit_logs(admin_username);
CREATE INDEX IF NOT EXISTS audit_logs_target_username_index ON audit_logs(target_username);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_index ON audit_logs(created_at);

-- Optimize for common filtering patterns
CREATE INDEX IF NOT EXISTS orders_completed_at_desc_index ON orders(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_pending_index ON orders(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS items_order_id_status_index ON items(order_id, status);

-- Update database statistics for query optimizer
ANALYZE orders;
ANALYZE staff;
ANALYZE items;
ANALYZE audit_logs;
```

### Why These Indexes:
- **staff.username:** Used in authentication lookups (frequent)
- **orders.created_at, orders.completed_at:** Used in monitoring queries (6-hour calculations)
- **items.order_id:** Kitchen display lookups
- **audit_logs columns:** Admin dashboard filters
- **Partial indexes:** Filter unwanted rows to reduce index size

---

## 3. Monitoring Query Optimization (RECOMMENDED)

The current monitoring query runs expensive EXTRACT(EPOCH) calculations every 30 seconds:

```sql
-- Current slow query (avoid)
SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60) as avg_mins
FROM orders
WHERE created_at > NOW() - INTERVAL '6 hours'
AND completed_at IS NOT NULL;
```

### Optimized Approach:
Use a cached metrics table that's updated periodically instead of calculating on every request:

```sql
-- Create metrics cache table
CREATE TABLE IF NOT EXISTS metrics_cache (
  id SERIAL PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10, 2),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '5 minutes',
  UNIQUE(metric_type)
);

-- Update monitoring controller to check cache first (see sample below)
-- If expired, recalculate and update cache
```

### Implementation in Code:
Modify `server/src/controllers/monitoringController.ts`:

```typescript
// Check cache first
const cachedMetric = await db('metrics_cache')
  .where('metric_type', 'avg_prep_time')
  .andWhere('expires_at', '>', db.raw('NOW()'))
  .first();

if (cachedMetric) {
  avgPrepTime = Number(cachedMetric.metric_value);
} else {
  // Recalculate and cache
  const prepTimeData = await db('orders')
    .whereRaw("created_at > NOW() - INTERVAL '6 hours'")
    .whereNotNull('completed_at')
    .select(db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60) as avg_mins'))
    .first();
  
  avgPrepTime = parseFloat(String(prepTimeData?.avg_mins || 0));
  
  // Update cache
  await db('metrics_cache')
    .where('metric_type', 'avg_prep_time')
    .update({
      metric_value: avgPrepTime,
      calculated_at: db.fn.now(),
      expires_at: db.raw("NOW() + INTERVAL '5 minutes'")
    })
    .catch(() => {});
}
```

---

## 4. Efficient Order Statistics Query

**Current:** 3 separate COUNT queries
```typescript
const totalOrders = await db('orders').count('id as total').first();
const completedOrders = await db('orders').whereNotNull('completed_at').count('id as count').first();
const pendingOrders = await db('orders').whereNull('completed_at').count('id as count').first();
```

**Optimized:** Single query with FILTER clause (requires PostgreSQL 9.4+)
```sql
SELECT 
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed,
  COUNT(*) FILTER (WHERE completed_at IS NULL) as pending,
  COUNT(*) as total
FROM orders;
```

**Result:** 66% reduction in database queries (3 → 1)

---

## 5. Automated Maintenance Tasks (OPTIONAL)

For optimal query performance, PostgreSQL needs regular maintenance:

### Weekly VACUUM ANALYZE:
```sql
-- Run weekly in off-peak hours
VACUUM ANALYZE orders;
VACUUM ANALYZE staff;
VACUUM ANALYZE items;
VACUUM ANALYZE audit_logs;
```

### Monitor Index Usage:
```sql
-- Identify unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Drop unused indexes (if safe)
DROP INDEX IF EXISTS index_name;
```

---

## 6. Performance Monitoring Checklist

### Monitor These Metrics:
- [ ] Database latency (target: < 200ms for "Optimal")
- [ ] Active connections (should stay < max pool size)
- [ ] Memory usage (alert if > 85%)
- [ ] Pending orders count (alert if > 50)
- [ ] Stalled orders (orders pending > 2 hours)

### Check Performance:
```sql
-- Current database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Connection count
SELECT datname, numbackends FROM pg_database WHERE datname = current_database();

-- Cache hit ratio (should be > 99%)
SELECT 
  sum(heap_blks_read) as heap_read, 
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

---

## 7. Architecture Changes Deployed

### Connection Pool:
```
Before: min 0, max 5
After:  min 2, max 10
```

### Result:
- ✅ Dashboard can handle 10 concurrent monitoring requests
- ✅ Kitchen display + system monitoring + audit logs won't compete for connections
- ✅ Idle connections kept alive (30s) to avoid reconnection overhead

---

## 8. Next Steps

1. **Run the SQL index creation queries** in your PostgreSQL database
2. **Implement metrics caching** in `monitoringController.ts` (optional but recommended)
3. **Monitor performance** using the queries in Section 6
4. **Schedule weekly VACUUM ANALYZE** if using managed PostgreSQL

---

## Performance Improvements Timeline

| Phase | Action | Expected Latency |
|-------|--------|------------------|
| **Before** | No optimization | 500ms+ (Degraded) |
| **After Phase 1** | Connection pool + indexes | 200-300ms (Good) |
| **After Phase 2** | Metrics caching | <200ms (Optimal) |

---

## Support Commands

Check your Render PostgreSQL logs:
```bash
# If using Render.com
curl "https://api.render.com/v1/services/{service_id}/logs" \
  -H "Authorization: Bearer ${RENDER_API_KEY}"
```

View active database connections:
```sql
SELECT 
  usename,
  application_name,
  state,
  query
FROM pg_stat_activity
WHERE datname = current_database();
```

---

**Last Updated:** 2025-12-21  
**System:** XYZ Hotel POS - Performance Optimization Guide
