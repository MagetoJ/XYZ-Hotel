# Inventory Upload - Diagnostic Report & Root Cause Analysis

## Summary
You can **upload files successfully** but **items don't appear** in the inventory table. This document outlines the diagnostic tests to run and the likely causes.

---

## Database Configuration

**Development Mode (your current environment):**
- Database: PostgreSQL
- Connection: `postgresql://postgres:postgres@localhost:5432/pos_mocha_dev`
- Fallback: `process.env.DATABASE_URL`

---

## Diagnostic Steps to Run

### Step 1: Verify Database Connection & Schema
```bash
# Check if PostgreSQL is running
psql -U postgres -h localhost -d pos_mocha_dev

# Run inside psql to check inventory_items table
\d inventory_items

# Check if table exists and what columns are present
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'inventory_items' ORDER BY ordinal_position;

# Count items in database
SELECT COUNT(*) FROM inventory_items;

# Check is_active distribution
SELECT is_active, COUNT(*) FROM inventory_items GROUP BY is_active;
```

### Step 2: Run Diagnostic Script
```bash
# Navigate to project root
cd C:\Users\DELL\Desktop\POS Mocha

# Run the diagnostic script (requires Node.js and dependencies)
node test-inventory-debug.js
```

This will test:
- ✅ Database connection
- ✅ Table structure
- ✅ is_active flag values
- ✅ CSV parsing logic
- ✅ INSERT operations
- ✅ SELECT queries (same as API)

### Step 3: Test API Endpoint Directly

```bash
# Get your auth token first, then test:
curl -X GET http://localhost:3000/api/inventory \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"

# Test for BAR type only
curl -X GET "http://localhost:3000/api/inventory?inventory_type=bar" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Step 4: Check Browser Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Try uploading CSV
4. Look for the `/api/inventory/upload` request
5. Check:
   - Response status (200, 400, 500?)
   - Response body (error message?)
   - Response headers

### Step 5: Check Server Logs
Watch the server console output when uploading:
```bash
npm run dev
# Watch for messages like:
# 📦 Starting inventory upload, file: inventory_updated_with_prices.csv
# 📊 Parsed rows: 134
# 📥 Items to insert: 134
# ✅ Inserted items result: [...]
# 🔢 Total items in DB after upload: {...}
```

---

## Likely Root Causes & Solutions

### 1. **Role-Based Filtering Issue** 
**Symptom:** Upload succeeds but items don't show
**Cause:** User role doesn't have permission to see the inventory type

**Check:**
```javascript
// In InventoryManagement.tsx component
console.log('User role:', user?.role);
console.log('Allowed types:', getAllowedInventoryTypes());
```

**Fix:** 
- If user is "admin" or "manager" → should see all types
- If "kitchen_staff" → only sees "kitchen" type
- If "receptionist" → only sees "bar", "housekeeping", "minibar"

### 2. **is_active Flag Set to False**
**Symptom:** Upload shows success but items invisible
**Cause:** Uploaded items have `is_active = false`

**Check:**
```sql
SELECT name, is_active FROM inventory_items 
WHERE name LIKE 'BALOZI%' OR name LIKE '4TH STREET%';
```

**Fix:** In `InventoryManagement.tsx` line 23:
```typescript
let query = db('inventory_items').where('is_active', true);  // ✅ Current (correct)
// Previously was: .whereNot('is_active', false) ❌ (we fixed this)
```

### 3. **Type Normalization Issue**
**Symptom:** CSV has "BAR" but database expects "bar"
**Cause:** Type not normalized correctly during upload

**Check:**
```sql
SELECT DISTINCT inventory_type FROM inventory_items;
```

Expected output: `bar`, `kitchen`, `housekeeping`, `minibar`
If you see: `BAR`, `KITCHEN`, etc. → **This is the issue!**

**Fix:** Already applied in `inventoryController.ts` line 297-299:
```typescript
const typeNormalized = typeRaw ? typeRaw.toLowerCase().trim() : 'bar';
const validTypes = ['kitchen', 'bar', 'housekeeping', 'minibar'];
const type = validTypes.includes(typeNormalized) ? typeNormalized : 'bar';
```

### 4. **Database Transaction Rollback**
**Symptom:** Upload succeeds but no items inserted
**Cause:** Database transaction failed silently

**Check:** Look for error in server logs like:
```
Knex: transaction error
```

**Fix:** Already improved logging in upload controller

### 5. **API Response Filtering**
**Symptom:** Items in database but API doesn't return them
**Cause:** API applies filters that exclude items

**Check in Network tab:**
```javascript
// What the API returns
GET /api/inventory
Response: []  // Empty array!

// But database has items:
SELECT COUNT(*) FROM inventory_items  -- Returns 134
```

**Debugging:** Add filter check in console:
```javascript
// In browser console after fetching
const token = localStorage.getItem('pos_token');
fetch('http://localhost:3000/api/inventory', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('API returned:', data.length, 'items');
  console.log('Sample:', data[0]);
})
```

---

## CSV File Analysis

Your file: `inventory_updated_with_prices.csv`

**Expected columns (flexible naming):**
- Item Name ✅
- Type ✅ (Values should normalize to: bar, kitchen, housekeeping, minibar)
- Current Stock ✅
- Unit ✅
- Cost per Unit (KES) ✅
- Supplier / supplier_name ✅

**Current column mapping in your CSV:**
```
"Item Name" → finds ✅
"Type" → expects BAR/KITCHEN/HOUSEKEEPING/MINIBAR → normalizes to lowercase ✅
"Current Stock" → finds ✅
"Unit" → finds ✅
"Cost per Unit (KES)" → finds ✅
"supplier_name" → finds ✅ (also checks for "Supplier")
```

---

## Test Results Template

Run these diagnostics and fill in the results:

```
📊 TEST RESULTS
===============

Database Connection:       [ PASS / FAIL ]
inventory_items Table:     [ EXISTS / MISSING ]
Total items in DB:         [ ? items ]
Active items:              [ ? items ]
Inactive items:            [ ? items ]

CSV Parse Test:
  - Rows in CSV:           [ ? rows ]
  - Successfully parsed:   [ ? items ]
  - Parse failures:        [ ? items ]

API Test:
  - GET /api/inventory:    [ ? items returned ]
  - Status code:           [ 200 / 400 / 500 ]

Upload Test:
  - Response status:       [ 200 / 400 / 500 ]
  - Items inserted:        [ ? items ]
  - Items updated:         [ ? items ]

After Upload:
  - Items in DB:           [ ? items ]
  - Items returned by API: [ ? items ]
  - Visible in UI:         [ YES / NO ]
```

---

## Files Modified for Fixes

1. **server/src/routes/inventoryRoutes.ts**
   - Fixed multer error handling middleware

2. **server/src/controllers/inventoryController.ts**
   - Changed: `whereNot('is_active', false)` → `where('is_active', true)`
   - Fixed: Type normalization logic
   - Added: Enhanced logging

3. **src/react-app/components/admin/InventoryManagement.tsx**
   - Added: Recharts visualizations
   - Added: Chart data generation functions

---

## Next Steps

1. **Build the server** with the fixes:
   ```bash
   cd server
   npm run build
   ```

2. **Run the diagnostic** script to identify the exact issue

3. **Share the test results** to pinpoint the root cause

4. **Apply targeted fix** based on which test fails

---

## Support Information

If you get stuck:

1. **Check server logs** - Look for errors in real-time
2. **Check browser console** - DevTools → Console tab
3. **Check Network tab** - See what the API actually returns
4. **Check database directly** - Use psql or DB client to verify data

The upload succeeds because the file is being processed and saved (no file errors). Items don't show because one of these filters is excluding them from the API response.
