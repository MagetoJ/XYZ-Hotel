# Superadmin Monitoring System - Setup Guide

## Overview

The monitoring system provides real-time system metrics, predictive failure analysis, and performance visualization through graphs. Only superadmin and admin users can access this feature.

## Components Created

### 1. Backend Files

#### `server/src/controllers/monitoringController.ts`
Contains four main functions:
- **getSystemHealth()**: Real-time system metrics and predictive analysis
  - Database latency monitoring
  - CPU and memory usage tracking
  - Prep time risk prediction
  - Order completion statistics
  
- **getSystemMetricsHistory()**: Historical metrics for trend analysis
- **getDatabaseMetrics()**: PostgreSQL performance data
- **getPerformanceAlerts()**: Active system alerts and warnings

#### `server/src/routes/monitoringRoutes.ts`
Exposes four endpoints (all require authentication and admin/superadmin role):
- `GET /api/monitoring/health` - System health and predictions
- `GET /api/monitoring/metrics-history` - Historical data
- `GET /api/monitoring/database` - Database metrics
- `GET /api/monitoring/alerts` - Active alerts

#### Updated `server/src/middleware/auth.ts`
- Modified `authorizeRoles()` middleware
- **Superadmin now automatically inherits all admin permissions**
- No need to explicitly grant each permission to superadmin

### 2. Frontend Files

#### `src/react-app/components/SystemHealthDashboard.tsx`
Complete monitoring dashboard with:
- **System Status Card**: Shows overall health (Optimal/Good/Degraded)
- **Metrics Grid**: CPU load, memory usage, database latency, uptime
- **Failure Prediction**: Risk assessment based on prep times
- **Active Alerts**: High/medium/low severity notifications
- **24h Order Traffic Graph**: Area chart with hourly order volume
- **Order Statistics**: Total, completed, pending, completion rate
- **Auto-refresh**: Configurable refresh intervals (10s, 30s, 1m)

### 3. Updated `server/src/index.ts`
- Imported monitoring routes
- Registered `/api/monitoring` endpoint prefix

## Setup Instructions

### Step 1: Set Superadmin Role for MagetoJ

The user `MagetoJ` with password `Jabez2026` needs to have the `superadmin` role set. You can do this in one of three ways:

#### Option A: Using Database Query (Direct)

```sql
-- Connect to your PostgreSQL database and run:
UPDATE staff 
SET role = 'superadmin' 
WHERE username = 'MagetoJ';

-- Verify the change:
SELECT id, name, username, role, is_active FROM staff WHERE username = 'MagetoJ';
```

#### Option B: Using psql Command Line

```bash
psql -U postgres -d your_database_name -c \
  "UPDATE staff SET role = 'superadmin' WHERE username = 'MagetoJ';"
```

#### Option C: Using DBeaver or pgAdmin GUI
1. Open your PostgreSQL database tool
2. Navigate to the `staff` table
3. Find the row with `username = 'MagetoJ'`
4. Edit the `role` column and set it to `superadmin`
5. Save the changes

### Step 2: Verify Setup

Login to the application with:
- **Username**: MagetoJ
- **Password**: Jabez2026

The monitoring dashboard should now be accessible.

### Step 3: Access the Monitoring Dashboard

#### In Admin Panel
1. After login, navigate to the admin dashboard
2. Look for "System Health" or "Monitoring" menu item
3. Click to open the SystemHealthDashboard component

#### Via Direct URL
```
https://your-app.com/admin/monitoring
```

#### Via API
```bash
# Get health data
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.com/api/monitoring/health

# Get alerts
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.com/api/monitoring/alerts

# Get metrics history (last 24 hours)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.com/api/monitoring/metrics-history

# Get database metrics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.com/api/monitoring/database
```

## Features Explained

### System Health Endpoint (`/api/monitoring/health`)

Returns:
```json
{
  "status": "Optimal|Good|Degraded",
  "timestamp": "2025-12-20T10:30:45Z",
  "metrics": {
    "cpuLoad": 0.5,
    "memoryUsage": 45.2,
    "uptime": 86400,
    "dbLatency": 125,
    "totalMemory": 8589934592,
    "freeMemory": 4294967296,
    "platform": "linux",
    "cpus": 4
  },
  "predictions": {
    "prepTimeRisk": "Low|Moderate|High",
    "avgPrepTime": "15.5",
    "recommendation": "System Stable|Monitor Kitchen Load|Increase Kitchen Staff",
    "estimatedServiceDegradation": "Unlikely|Possible|Likely"
  },
  "graphData": [
    { "hour": "10:00", "count": 15 },
    { "hour": "11:00", "count": 28 }
  ],
  "orderStats": {
    "total": 450,
    "completed": 425,
    "pending": 25,
    "completionRate": "94.44"
  }
}
```

### Predictive Failure Analysis

The system analyzes kitchen prep times to predict service degradation:

- **Low Risk**: Avg prep time < 20 minutes → "System Stable"
- **Moderate Risk**: 20-30 minutes → "Monitor Kitchen Load"
- **High Risk**: > 30 minutes → "Increase Kitchen Staff" / "Likely" degradation

### Performance Alerts

Automatically generated alerts for:
- Database latency > 500ms
- CPU load exceeding available cores
- Memory usage > 85%
- 50+ pending orders
- Orders stalled for 2+ hours

### Metrics Available

#### System Metrics
- **CPU Load**: 1-minute average (compared to core count)
- **Memory Usage**: Percentage of total memory used
- **Uptime**: Time since server started
- **Database Latency**: Round-trip time for test query

#### Order Metrics
- **Hourly Traffic**: Orders created per hour (last 24 hours)
- **Total Orders**: All orders in system
- **Completed Orders**: Finished and delivered
- **Pending Orders**: Waiting or in progress
- **Completion Rate**: Percentage of completed orders

#### Database Metrics
- **Table Sizes**: Storage used by each table
- **Active Connections**: Current database connections
- **Database Size**: Total storage used

## Integration with Admin Dashboard

To integrate the monitoring dashboard into your admin panel:

### Option 1: Add to Admin Routes

Edit `src/react-app/pages/AdminDashboard.tsx` or relevant admin file:

```tsx
import SystemHealthDashboard from '../components/SystemHealthDashboard';

// In your routing or menu:
<Route path="/admin/monitoring" element={<SystemHealthDashboard />} />
```

### Option 2: Add Menu Item

Add to your admin navigation menu:

```tsx
<Link to="/admin/monitoring" className="nav-item">
  System Health
</Link>
```

### Option 3: Embed in Dashboard

Add as a widget in your main admin dashboard:

```tsx
import SystemHealthDashboard from '../components/SystemHealthDashboard';

export default function AdminDashboard() {
  return (
    <div>
      {/* Other dashboard content */}
      <SystemHealthDashboard />
    </div>
  );
}
```

## Troubleshooting

### "Access Denied" Error

**Problem**: Getting 403 Forbidden when accessing monitoring endpoints

**Solutions**:
1. Verify user role is set to `superadmin`:
   ```sql
   SELECT username, role FROM staff WHERE username = 'MagetoJ';
   ```
2. Check token is valid and not expired
3. Verify Authorization header format: `Bearer YOUR_TOKEN`

### No Data Displayed

**Problem**: Dashboard shows "No data available"

**Solutions**:
1. Ensure database is connected and accessible
2. Check server logs for database errors
3. Verify authentication token is present
4. Try refreshing the page or clicking "Refresh Now"

### Database Query Errors

**Problem**: "Failed to fetch health data" message

**Solutions**:
1. Check PostgreSQL is running
2. Verify DATABASE_URL environment variable
3. Check database user has necessary permissions
4. Review server logs for specific error

### Performance Issues

**Problem**: Slow loading or frequent timeouts

**Solutions**:
1. Increase refresh interval (30s or 1m instead of 10s)
2. Optimize database queries if dataset is large
3. Check server resources (CPU, memory)
4. Consider implementing caching for historical data

## Security Considerations

### Authentication
- All monitoring endpoints require valid JWT token
- Only superadmin/admin users can access
- Tokens expire after configured duration (typically 24 hours)

### Authorization
- Superadmin role automatically inherits all admin permissions
- No explicit permission checks needed
- Role is verified on every request

### Data Exposure
- Sensitive metrics (CPU, memory) only visible to admins
- No sensitive user data in response
- Database query details hidden in production mode

## Maintenance

### Regular Tasks
- Monitor alert thresholds
- Adjust prep time thresholds based on kitchen capacity
- Review database metrics weekly
- Check for stalled orders regularly

### Performance Optimization
- Index heavily-queried columns (created_at, status)
- Archive old orders regularly
- Monitor table sizes and growth rates
- Consider partitioning large tables by date

### Monitoring the Monitor
- Ensure monitoring endpoints don't add excessive load
- Keep monitoring component lightweight
- Avoid polling too frequently
- Use WebSocket for real-time updates if needed

## Advanced Usage

### Custom Alerts

Modify `getPerformanceAlerts()` in `monitoringController.ts` to add custom logic:

```typescript
// Example: Alert if specific products are running low
const lowStockItems = await db('inventory_items')
  .where('current_stock', '<', 'minimum_stock');

if (lowStockItems.length > 0) {
  alerts.push({
    severity: 'MEDIUM',
    message: `${lowStockItems.length} items below minimum stock`
  });
}
```

### Historical Analysis

Use the `getSystemMetricsHistory()` endpoint to analyze trends:

```typescript
// Example: Get last 7 days of metrics
GET /api/monitoring/metrics-history?hours=168
```

### Custom Graphs

Add additional charts to the dashboard:

```tsx
// Example: Add a pie chart for order types
<PieChart data={orderTypeStats}>
  <Pie dataKey="count" />
</PieChart>
```

## API Documentation

### GET /api/monitoring/health
Returns current system health status and predictions

**Auth**: Required (superadmin/admin)
**Response**: HealthData object
**Example**: See "Predictive Failure Analysis" section above

### GET /api/monitoring/metrics-history
Returns historical metrics for trend analysis

**Auth**: Required (superadmin/admin)
**Query Parameters**:
- `hours` (optional): Number of hours to retrieve (default: 24)

**Response**:
```json
{
  "hours": 24,
  "data": [
    {
      "hour": "2025-12-20T10:00:00Z",
      "order_count": 15,
      "avg_prep_time": 18.5
    }
  ]
}
```

### GET /api/monitoring/database
Returns database performance metrics

**Auth**: Required (superadmin/admin)
**Response**:
```json
{
  "latency": 125,
  "tables": [
    { "schemaname": "public", "tablename": "orders", "size": "50 MB" }
  ],
  "connections": [
    { "datname": "xyz_hotel_pos", "active_connections": 5 }
  ]
}
```

### GET /api/monitoring/alerts
Returns active system alerts

**Auth**: Required (superadmin/admin)
**Response**:
```json
{
  "alerts": [
    {
      "severity": "HIGH|MEDIUM|LOW",
      "message": "Alert description",
      "timestamp": "2025-12-20T10:30:45Z"
    }
  ],
  "alertCount": 3
}
```

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review server logs for error messages
3. Verify database connectivity
4. Contact support with error logs attached

---

**Status**: ✅ Monitoring System Installed and Ready
**Last Updated**: December 20, 2025
