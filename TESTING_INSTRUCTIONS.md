# Testing Instructions - Inventory Upload Issues

## Overview
Files have been created to help diagnose why items upload successfully but don't display. Follow these steps **in order**.

---

## STEP 1: Rebuild the Server (Required)

The code has been fixed. You **must** rebuild for changes to take effect.

```bash
cd C:\Users\DELL\Desktop\POS Mocha\server
npm run build
```

Expected output should end with:
```
(no output errors = success)
```

**What was fixed:**
- ✅ Multer error handling middleware
- ✅ is_active filter (from `whereNot(false)` → `where(true)`)
- ✅ Type normalization (BAR → bar)
- ✅ Enhanced logging for debugging

---

## STEP 2: Run the Server

```bash
cd C:\Users\DELL\Desktop\POS Mocha
npm run dev
```

**Watch the server console carefully** for messages during upload (see STEP 5).

---

## STEP 3: Run Diagnostics on Your Database

Open a terminal with PostgreSQL client access:

### Option A: Using psql (Command Line)
```bash
psql -U postgres -h localhost -d pos_mocha_dev
```

### Option B: Using pgAdmin (GUI)
- Right-click database → Query Tool
- Paste SQL queries

### Option C: Using DBeaver (GUI)
- Create connection to localhost:5432
- Execute SQL queries

**Then run the SQL diagnostics:**

Use the file: `DIAGNOSTIC_SQL.sql`

Copy-paste each section's queries and note the results.

**Key queries to run first:**

```sql
-- 1. Check if items exist
SELECT COUNT(*) as total_items FROM inventory_items;

-- 2. Check if they're marked as active
SELECT is_active, COUNT(*) FROM inventory_items GROUP BY is_active;

-- 3. Check if types are correct
SELECT DISTINCT inventory_type FROM inventory_items;

-- 4. Look for your specific items
SELECT name, inventory_type, is_active FROM inventory_items 
WHERE name ILIKE '%WINE%' OR name ILIKE '%BALOZI%' 
LIMIT 5;
```

**Record the results:**
- Total items: `___`
- Active: `___` | Inactive: `___` | NULL: `___`
- Types found: `___`
- Items found: [ YES / NO ]

---

## STEP 4: Check Your User Role

In browser console (F12 → Console):

```javascript
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('Your role:', user.role);
console.log('Your email:', user.email);
```

**Expected for admin:** `admin` or `manager`

If you're `kitchen_staff`: You can only see `kitchen` items
If you're `receptionist`: You can only see `bar`, `housekeeping`, `minibar` items

---

## STEP 5: Test Upload Process (Watch Console)

### A. Watch Server Console
Keep the server running (from STEP 2) and watch it.

### B. Upload in Browser
1. Go to Admin → Inventory Management
2. Click "Import CSV / Excel"
3. Select: `C:\Users\DELL\Downloads\inventory_updated_with_prices.csv`

### C. Watch for These Messages in Server Console

```
✅ EXPECTED OUTPUT:
📦 Starting inventory upload, file: inventory_updated_with_prices.csv
📊 Parsed rows: 134
📥 Items to insert: 134
📤 Items to update: 0
✅ Inserted items result: [...]
🔢 Total items in DB after upload: { count: 135 }
```

### D. Check Browser Response
1. Open DevTools (F12)
2. Network tab
3. Look for `/api/inventory/upload` request
4. Check Response:
   - Should see: `{ processed_count: 134, inserted: 134 }`
   - Status should be: **200** (not 400 or 500)

---

## STEP 6: Verify API Returns Data

In browser console (F12 → Console):

```javascript
const token = localStorage.getItem('pos_token');

// Test API
fetch('http://localhost:3000/api/inventory', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('Items from API:', data.length);
  console.log('Types:', [...new Set(data.map(i => i.inventory_type))]);
  console.log('Sample:', data[0]);
});
```

**Expected Output:**
```javascript
Items from API: 134
Types: ['bar', 'kitchen', 'housekeeping']
Sample: { 
  id: 1, 
  name: '4TH STREET RED 750ML', 
  inventory_type: 'bar',
  current_stock: 2,
  cost_per_unit: 2000,
  is_active: true,
  ...
}
```

---

## STEP 7: Check if UI Shows Items

1. In browser, stay on Inventory Management page
2. Look at the table below the charts
3. Should show your uploaded items

**If items don't appear:**
- Hard refresh: `Ctrl + Shift + R`
- Check browser console for JavaScript errors
- Go to DIAGNOSIS section below

---

## DIAGNOSIS: If Items Still Don't Show

### Problem 1: Items Not in Database

**Symptom:** SQL query shows 0 items, but upload said "success"

**Cause:**
- File parsing failed silently
- Transaction rolled back
- Multer didn't receive file

**Fix:**
1. Check server console error messages
2. Rebuild: `npm run build`
3. Restart server
4. Try upload again

---

### Problem 2: Items in Database but API Returns Empty

**Symptom:** SQL shows 134 items, but API returns 0

**Cause:**
- `is_active` set to false
- Type normalization issue
- Role-based filtering

**Check:**
```sql
-- 1. Fix is_active
UPDATE inventory_items SET is_active = true WHERE is_active IS NULL OR is_active = false;

-- 2. Fix types
UPDATE inventory_items SET inventory_type = LOWER(inventory_type);

-- 3. Check result
SELECT COUNT(*) FROM inventory_items WHERE is_active = true;
```

Then refresh page.

---

### Problem 3: API Returns Items but UI Shows Nothing

**Symptom:** Browser console shows items, but table is empty

**Cause:**
- React component bug
- CSS hiding items
- Component state not updating

**Fix:**
1. Hard refresh: `Ctrl + Shift + R`
2. Wait 3 seconds for page to fully load
3. Check for red error banner

If still nothing:
- Check browser console for JavaScript errors (red text)
- Look for "TypeError" or "cannot read property"

---

## Files Created for Testing

1. **DIAGNOSTIC_REPORT.md** - Comprehensive analysis guide
2. **QUICK_TEST.md** - Quick tests to identify issue
3. **DIAGNOSTIC_SQL.sql** - SQL queries for database check
4. **test-inventory-debug.js** - Automated diagnostic script
5. **tests/inventory-upload.spec.ts** - Playwright tests

---

## Files Modified for Fixes

1. ✅ **server/src/routes/inventoryRoutes.ts** - Fixed error handling
2. ✅ **server/src/controllers/inventoryController.ts** - Fixed filtering & logging
3. ✅ **src/react-app/components/admin/InventoryManagement.tsx** - Added charts

---

## Expected Final Result

After all steps:

✅ **Upload shows:** "✅ Import Successful! Processed 134 items."

✅ **Database has:** 134 items with `is_active = true`

✅ **Types are:** `bar`, `kitchen`, `housekeeping`, `minibar` (lowercase)

✅ **API returns:** All 134 items

✅ **UI displays:**
- Table with all items
- Charts showing:
  - Stock Levels by Type
  - Stock Health (pie chart)
  - Value Distribution
  - Top Items by Value

---

## Troubleshooting Checklist

- [ ] Rebuilt server with `npm run build`
- [ ] Ran server with `npm run dev`
- [ ] Uploaded CSV file
- [ ] Checked server console for error messages
- [ ] Ran SQL diagnostics to verify items in DB
- [ ] Checked API response in browser console
- [ ] Hard refreshed page with `Ctrl + Shift + R`
- [ ] Verified user role is admin/manager
- [ ] Checked browser console for JavaScript errors

---

## Getting Help

If still stuck, share:

1. **From SQL diagnostics:**
   - Total items count
   - is_active flag distribution
   - inventory_type values

2. **From server console:**
   - Upload messages (screenshot or copy)
   - Any error messages

3. **From browser console:**
   - API response count
   - Sample item structure
   - Any JavaScript errors

4. **From browser Network tab:**
   - /api/inventory/upload response status
   - Response body content
