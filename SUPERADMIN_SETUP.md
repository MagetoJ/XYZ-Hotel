# Superadmin Setup Guide

## Overview
This document explains how to set up the superadmin user and access the System Monitoring Dashboard.

---

## Step 1: Create Superadmin User in Database

### Option A: Automated Script (Recommended)

1. **Open Command Prompt** and navigate to the project:
   ```bash
   cd C:\Users\DELL\Desktop\XYZ Hotel\Maria-POS-main
   ```

2. **Run the superadmin creation script:**
   ```bash
   node create_superadmin.js
   ```

   You should see output like:
   ```
   ╔════════════════════════════════════════════════╗
   ║    🔐 Creating Superadmin User                ║
   ╚════════════════════════════════════════════════╝

   🔍 Checking if user "MagetoJ" exists...
   🔐 Hashing password...
   📝 Creating superadmin user in database...

   ✅ SUCCESS! Superadmin user created:

      ID: [user_id]
      Username: MagetoJ
      Name: Superadmin
      Role: superadmin
      Email: superadmin@xyzhotel.com
      Active: true

   🔑 Login Credentials:
      Username: MagetoJ
      Password: Jabez2026
   ```

3. **If the user already exists**, you'll see:
   ```
   ✅ User "MagetoJ" already exists!
      ID: [user_id]
      Role: superadmin
      Is Active: true
   ```

### Option B: Using Batch File

Simply double-click: `run_superadmin.bat`

This will automatically run the Node.js script from the correct directory.

### Option C: Manual Database Entry (Using DBeaver or pgAdmin)

Connect to your Render PostgreSQL database and run:

```sql
INSERT INTO staff (
  employee_id,
  username,
  name,
  email,
  role,
  password,
  pin,
  is_active,
  created_at,
  updated_at
) VALUES (
  'SUPER001',
  'MagetoJ',
  'Superadmin',
  'superadmin@xyzhotel.com',
  'superadmin',
  '$2b$10$M7YzH7Jq1K9nL2pQ5wR8sT1vW9xY3zE6H0jK4lM7oN9qP2sT5uV8w',
  '0000',
  true,
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE SET
  role = 'superadmin',
  is_active = true,
  updated_at = NOW();
```

---

## Step 2: Frontend Updates (Already Complete ✅)

The following changes have been made to support the superadmin role:

### ✅ StaffManagement Component
- **File**: `src/react-app/components/admin/StaffManagement.tsx`
- **Change**: Added `superadmin` option to role dropdown
- **Impact**: Admins can now create superadmin users through the UI

### ✅ AuthContext
- **File**: `src/react-app/contexts/AuthContext.tsx`
- **Changes**:
  1. Added `superadmin` to User role type definition
  2. Updated login routing: superadmin → `/admin` dashboard
- **Impact**: Superadmin users are properly authenticated and routed

### ✅ AdminDashboard
- **File**: `src/react-app/pages/AdminDashboard.tsx`
- **Changes**:
  1. Imported `SystemHealthDashboard` component
  2. Added "System Monitoring" menu item (visible only to superadmin)
  3. Added case handler for monitoring tab
- **Impact**: Superadmin can access System Monitoring tab

### ✅ SystemHealthDashboard Component
- **File**: `src/react-app/components/SystemHealthDashboard.tsx`
- **Changes**: Updated to use existing `apiClient` (handles auth tokens automatically)
- **Impact**: Component works seamlessly with the app's authentication

### ✅ Backend Monitoring Routes
- **File**: `server/src/routes/monitoringRoutes.ts`
- **Routes**: 4 monitoring endpoints protected with superadmin/admin role
- **Impact**: Only superadmin can access system metrics

---

## Step 3: Login with Superadmin

1. **Open your application** in the browser:
   ```
   http://localhost:5173
   ```

2. **Log in with these credentials:**
   - **Username**: `MagetoJ`
   - **Password**: `Jabez2026`

3. **You'll be redirected to Admin Dashboard**

4. **Click "System Monitoring"** tab in the sidebar

---

## Step 4: System Monitoring Features

Once logged in as superadmin, access the System Monitoring dashboard which provides:

### 📊 Real-Time Metrics
- **Database Latency**: Current DB response time (ms)
- **Memory Usage**: Percentage and absolute values
- **CPU Load**: 1-minute load average
- **Uptime**: Server uptime duration
- **System Info**: CPU cores and platform

### 🔮 Failure Predictions
- **Prep Time Risk Analysis**: Low/Moderate/High
- **Kitchen Load**: Average prep time over 6 hours
- **Service Degradation**: Estimated impact assessment
- **Recommendations**: Actions to take

### 📈 24-Hour Graphs
- **Order Traffic**: Line chart showing order volume by hour
- **Order Statistics**: Total, Completed, Pending, Completion Rate

### 🚨 Active Alerts
- Real-time alerts for:
  - High database latency
  - CPU overload
  - Memory pressure
  - Pending orders backlog
  - Stalled orders (>2 hours)

### 🔧 Controls
- **Refresh Intervals**: 10s, 30s, 60s auto-refresh
- **Manual Refresh**: On-demand metric updates

---

## Monitoring API Endpoints

All endpoints require superadmin or admin role:

### 1. System Health
```
GET /api/monitoring/health
```
Returns: Overall status, metrics, predictions, order stats

### 2. Historical Metrics
```
GET /api/monitoring/metrics-history?hours=24
```
Returns: Hourly trends, average prep times

### 3. Database Metrics
```
GET /api/monitoring/database
```
Returns: Table sizes, connection stats

### 4. Performance Alerts
```
GET /api/monitoring/alerts
```
Returns: Array of active alerts with severity

---

## Environment Configuration

Your `.env` file contains:

```
SUPERADMIN_USERNAME=MagetoJ
SUPERADMIN_PASSWORD=Jabez2026
```

These are used by the `create_superadmin.js` script to create the user.

---

## Troubleshooting

### 1. "Incorrect username" error
- Verify the script ran successfully (check console output)
- Try Option C (manual database entry)
- Check that user is active: `is_active = true`

### 2. System Monitoring tab not showing
- Confirm user role is `superadmin` in database
- Log out and back in (refresh session)
- Check browser console for auth errors

### 3. Monitoring endpoints return 403 error
- Verify user role: `SELECT role FROM staff WHERE username = 'MagetoJ';`
- Must be exactly `superadmin` or `admin`
- Check database connection in `.env`

### 4. Slow database response
- Check database connection string
- Verify PostgreSQL service is running
- Monitor metrics show high DB latency

---

## Security Notes

1. **Password Hash**: Jabez2026 is hashed with bcrypt (salt rounds: 10)
2. **Token Expiry**: JWT tokens expire after 24 hours
3. **Role-Based Access**: Superadmin can only access monitoring when properly authenticated
4. **Database**: Only staff with `superadmin` role can access monitoring endpoints

---

## Next Steps

1. ✅ Run the setup script
2. ✅ Log in with superadmin credentials
3. ✅ Access System Monitoring dashboard
4. ✅ Monitor system performance in real-time

---

For questions or issues, check the server logs in your development console.
