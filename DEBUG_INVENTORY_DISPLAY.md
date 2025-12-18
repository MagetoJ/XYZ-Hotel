# Debugging Inventory Display Issue

## Problem
- CSV upload works (132 items inserted to database)
- Items don't appear in the Inventory Management UI

## Step-by-Step Debugging

### Step 1: Verify Database Has Items
```bash
psql -U postgres -d pos_mocha_dev -c "SELECT COUNT(*) FROM inventory_items WHERE is_active = true;"
```
**Expected**: Should show 132 or similar high number

### Step 2: Check Your User Role
Open browser DevTools (F12) → Console, run:
```javascript
JSON.parse(localStorage.getItem('pos_user'))
```
**Expected**: Should show your role (admin, manager, kitchen_staff, receptionist, etc.)

**CRITICAL**: If the role is NOT one of these, that's the problem:
- admin
- manager
- kitchen_staff
- receptionist

### Step 3: Test API Directly
In browser Console, run:
```javascript
const token = localStorage.getItem('pos_token');
fetch('http://localhost:3000/api/inventory', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('API returned items:', data.length);
  console.log('First item:', data[0]);
})
.catch(e => console.error('API Error:', e));
```
**Expected**: Should log inventory items, not empty

### Step 4: Check Frontend State
In browser Console, after the page loads, check what the component is displaying:
```javascript
// Check localStorage
console.log('Token exists:', !!localStorage.getItem('pos_token'));
console.log('User:', localStorage.getItem('pos_user'));

// Check if inventory API is being called
// Open Network tab in DevTools → refresh page → look for /api/inventory GET request
// Check status code (should be 200) and response body (should have items)
```

### Step 5: If API Returns Empty
The backend role filter is removing all items. The issue is in the controller at lines 52-60:

Current logic: 
```
if kitchen_staff → show only kitchen type
if receptionist → show only bar/housekeeping/minibar type
if admin/manager → show all
```

**QUESTION**: What type of items did you upload? Check the CSV file to see what types are in the "Type" column.

## Common Issues

**Issue**: API returns empty array `[]`
- **Cause 1**: User role is not one of the allowed roles
- **Cause 2**: User is trying to see items of a type they don't have access to (e.g., kitchen_staff trying to see bar items)
- **Cause 3**: Items in database have `is_active = false`

**Issue**: Network error when calling API
- **Cause**: Server isn't running or port 3000 is wrong
- **Fix**: Run `npm run dev` in the project root

**Issue**: 401 or 403 error
- **Cause**: Token is invalid or expired
- **Fix**: Log out and log back in

## Quick Fix Checklist

1. ✅ Verify items are in database
2. ✅ Verify your user role is admin or manager
3. ✅ Verify API returns items
4. ✅ Refresh the page/clear browser cache
5. ✅ Check browser console for errors
6. ✅ Restart the development server
