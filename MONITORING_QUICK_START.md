# Superadmin Monitoring System - Quick Start (5 Minutes)

## What You Get

✅ Real-time system health dashboard  
✅ Predictive failure analysis  
✅ Performance alerts and warnings  
✅ 24-hour order traffic visualization  
✅ Database and server metrics  

## Installation (Already Done!)

The monitoring system has been fully implemented. Three simple steps to activate it:

## Step 1: Enable Superadmin Role (1 minute)

### Option A: Using Database Tool (DBeaver, pgAdmin, etc.)

1. Open your PostgreSQL database
2. Go to the `staff` table
3. Find the row where `username = 'MagetoJ'`
4. Change the `role` column from `admin` to `superadmin`
5. Save

### Option B: Using SQL Command

Run this SQL command against your database:

```sql
UPDATE staff SET role = 'superadmin' WHERE username = 'MagetoJ';
```

### Option C: Using Command Line

```bash
# Using psql directly
psql -U postgres -d your_database_name \
  -c "UPDATE staff SET role = 'superadmin' WHERE username = 'MagetoJ';"
```

### Option D: Using the SQL Script

```bash
# Navigate to project directory
cd "c:\Users\DELL\Desktop\XYZ Hotel\Maria-POS-main"

# Run the SQL setup script
psql -U postgres -d your_database_name -f server/setup-superadmin.sql
```

**Verify it worked:**

```sql
SELECT username, role FROM staff WHERE username = 'MagetoJ';
-- Should show: MagetoJ | superadmin
```

## Step 2: Restart the Server (1 minute)

```bash
# If running locally:
npm run dev

# Or if deployed:
# The server automatically picks up the role change
```

## Step 3: Access the Monitoring Dashboard (2 minutes)

1. **Login** with these credentials:
   - Username: `MagetoJ`
   - Password: `Jabez2026`

2. **Navigate** to the monitoring dashboard:
   - Admin Panel → System Health/Monitoring
   - Or: Direct URL: `/admin/monitoring`

3. **View metrics**:
   - System status
   - CPU, memory, database latency
   - Predictive failure alerts
   - 24h order traffic graph
   - Order statistics

## Features Overview

### System Status Card
Shows overall health: **Optimal** (green) / **Good** (yellow) / **Degraded** (red)

### Metrics Grid (Top Right)
- **Database Latency**: Response time in ms
- **Memory Usage**: Percentage of RAM used
- **CPU Load**: Current processor load
- **Uptime**: How long server has been running

### Failure Prediction
Analyzes kitchen prep times to predict if service will degrade:
- **Low Risk**: Prep times < 20 min → "System Stable"
- **Moderate Risk**: Prep times 20-30 min → "Monitor Kitchen Load"
- **High Risk**: Prep times > 30 min → "Increase Kitchen Staff"

### 24h Order Traffic
Area chart showing order volume by hour over last day

### Order Statistics
- Total orders
- Completed orders
- Pending orders
- Completion rate percentage

### Active Alerts
Real-time alerts for:
- High CPU/memory usage
- Slow database responses
- Stalled orders (> 2 hours)
- Too many pending orders (> 50)

## API Access

### Using cURL

Get system health:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.com/api/monitoring/health
```

Get active alerts:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.com/api/monitoring/alerts
```

Get last 24 hours of metrics:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.com/api/monitoring/metrics-history
```

Get database statistics:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.com/api/monitoring/database
```

### In Your Code

```typescript
// Fetch system health
const response = await fetch('/api/monitoring/health', {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await response.json();

console.log(data.status); // "Optimal" / "Good" / "Degraded"
console.log(data.metrics.dbLatency); // Database latency in ms
console.log(data.predictions.prepTimeRisk); // "Low" / "Moderate" / "High"
```

## What's in Each File

### Backend Files Created
- `server/src/controllers/monitoringController.ts` - System metrics logic
- `server/src/routes/monitoringRoutes.ts` - API endpoints
- `server/src/middleware/auth.ts` - Updated for superadmin permissions

### Frontend Files Created
- `src/react-app/components/SystemHealthDashboard.tsx` - Dashboard UI

### Configuration Files
- `server/setup-superadmin.sql` - Database setup script
- `MONITORING_SYSTEM_SETUP.md` - Detailed documentation
- `MONITORING_QUICK_START.md` - This file

## Troubleshooting

### "Access Denied" When Accessing Dashboard

**Problem**: Getting "403 Forbidden" error

**Solutions**:
1. Verify role change worked:
   ```sql
   SELECT username, role FROM staff WHERE username = 'MagetoJ';
   ```
   Should show `superadmin` role

2. Try logging out and logging back in
3. Clear browser cache
4. Check browser console for detailed error

### Dashboard Shows "No Data"

**Problem**: Dashboard loads but no metrics displayed

**Solutions**:
1. Ensure server is running
2. Check network tab in browser DevTools for API errors
3. Verify authentication token is valid
4. Check server logs for database connection issues

### Database Update Didn't Work

**Problem**: SQL command executed but role didn't change

**Solutions**:
1. Verify correct database is being used
2. Check row actually exists:
   ```sql
   SELECT * FROM staff WHERE username = 'MagetoJ';
   ```
3. Check for typos in username (case-sensitive)
4. Verify user has permissions to update staff table

## Refresh Intervals

The dashboard auto-refreshes system metrics. Choose your preferred interval:
- **10 seconds** - Real-time monitoring (uses more bandwidth)
- **30 seconds** - Balanced (recommended)
- **1 minute** - Less frequent updates (saves bandwidth)

Or click **Refresh Now** button to update immediately.

## Key Metrics Explained

### Database Latency
- **< 100ms**: Excellent
- **100-200ms**: Good
- **200-500ms**: Acceptable
- **> 500ms**: Slow - requires attention

### Memory Usage
- **< 70%**: Good
- **70-85%**: Monitor
- **> 85%**: Critical - needs cleanup

### CPU Load
- **< 1.0**: Low load
- **1.0-2.0**: Moderate load
- **> 2.0**: High load (if more CPUs available)
- **> CPU Count**: Overloaded

### Prep Time Risk
Based on average time between order creation and completion:
- **< 20 min**: Low risk
- **20-30 min**: Moderate risk
- **> 30 min**: High risk

## Common Use Cases

### Monitor Kitchen Performance
1. Go to System Health dashboard
2. Watch "Failure Prediction" section
3. Check "Avg Prep Time"
4. If trending high, increase kitchen staff

### Check Server Health
1. Look at Metrics Grid (top right)
2. Monitor Database Latency
3. Watch CPU and Memory Usage
4. Check Uptime

### Analyze Order Patterns
1. View "24h Order Traffic" graph
2. See order volume by hour
3. Plan staffing based on busy periods

### Handle Performance Issues
1. Check "Active Alerts" section
2. Read alert messages for specific issues
3. Take action (e.g., "Increase Kitchen Staff")
4. Alerts automatically update when resolved

## Performance Tips

### Optimize Dashboard
- Use 30s or 1m refresh interval instead of 10s
- Close dashboard when not needed
- Don't open multiple dashboard tabs

### Optimize Server
- Archive old orders periodically
- Monitor database growth
- Ensure adequate RAM allocated
- Check for slow queries in logs

### Optimize Database
- Create indexes on frequently-queried columns
- Partition large tables by date
- Run VACUUM and ANALYZE regularly
- Monitor connection pooling

## Next Steps

1. ✅ Set superadmin role (done above)
2. ✅ Restart server
3. ✅ Login as MagetoJ
4. ✅ Access monitoring dashboard
5. **→ Monitor your system!**

## Support

### Documentation
- Full setup guide: `MONITORING_SYSTEM_SETUP.md`
- Technical details: See file comments in source code
- API documentation: In `MONITORING_SYSTEM_SETUP.md`

### Troubleshooting
- Check server logs: `npm run dev` console output
- Database connection: Verify `DATABASE_URL` environment variable
- Authentication: Ensure JWT token is valid
- Role: Verify `superadmin` role is set

### Additional Features
- Custom alerts: Modify `monitoringController.ts`
- Additional graphs: Edit `SystemHealthDashboard.tsx`
- New metrics: Add to controller and component
- Email alerts: Integrate with email service

## Files Reference

```
XYZ Hotel/Maria-POS-main/
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── monitoringController.ts (NEW)
│   │   ├── routes/
│   │   │   └── monitoringRoutes.ts (NEW)
│   │   └── middleware/
│   │       └── auth.ts (UPDATED)
│   └── setup-superadmin.sql (NEW)
├── src/react-app/
│   └── components/
│       └── SystemHealthDashboard.tsx (NEW)
├── MONITORING_SYSTEM_SETUP.md (NEW)
└── MONITORING_QUICK_START.md (THIS FILE)
```

## You're All Set! 🎉

The monitoring system is now ready to use.

**Login credentials:**
- Username: `MagetoJ`
- Password: `Jabez2026`

**Next action:**
1. Set the superadmin role (Step 1 above)
2. Restart the server
3. Access the dashboard and start monitoring!

Any issues? Check `MONITORING_SYSTEM_SETUP.md` for detailed troubleshooting.

---

**Status**: ✅ Monitoring System Ready to Use
**Installation Time**: < 5 minutes
**Complexity**: Simple (1-line SQL update)
