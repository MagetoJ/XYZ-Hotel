# Quick Tests to Identify the Upload Issue

Run these tests in order to find out why items don't appear after upload.

---

## TEST 1: Check Database Directly (Fastest)

If you have PostgreSQL client or pgAdmin:

```sql
-- Count all items
SELECT COUNT(*) as total_items FROM inventory_items;

-- Count by is_active flag
SELECT 
  is_active, 
  COUNT(*) as count 
FROM inventory_items 
GROUP BY is_active;

-- Count by type
SELECT 
  inventory_type, 
  COUNT(*) as count,
  SUM(current_stock) as total_stock
FROM inventory_items 
GROUP BY inventory_type;

-- Show first 5 uploaded items (should have recent names from your CSV)
SELECT 
  id, 
  name, 
  inventory_type, 
  current_stock, 
  cost_per_unit,
  is_active,
  created_at
FROM inventory_items 
ORDER BY created_at DESC 
LIMIT 5;

-- Specifically check for your BAR items
SELECT * FROM inventory_items 
WHERE inventory_type = 'bar' 
AND (name LIKE '%WINE%' OR name LIKE '%BEER%' OR name LIKE '%4TH STREET%')
LIMIT 10;
```

**Expected Results if upload worked:**
- `total_items` = much higher than before
- Shows items with BAR, KITCHEN types (lowercase!)
- Items have `is_active = true`
- Created timestamps are recent

**If inventory is empty or unchanged:**
- ❌ Upload is NOT inserting into database
- **Go to: Reason #1**

---

## TEST 2: Check API Response

In browser console (F12 → Console):

```javascript
const token = localStorage.getItem('pos_token');

// Test 1: Get all inventory
fetch('http://localhost:3000/api/inventory', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('Total API response items:', data.length);
  console.log('Types found:', [...new Set(data.map(i => i.inventory_type))]);
  console.log('Sample items:', data.slice(0, 3));
})

// Test 2: Get BAR type only
fetch('http://localhost:3000/api/inventory?inventory_type=bar', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('BAR type items:', data.length);
  console.log('Sample BAR:', data.slice(0, 2));
})
```

**Expected Results if working:**
- `Total API response items` = matches database count
- Sample items show: `{ id, name, inventory_type, current_stock, cost_per_unit, ... }`
- BAR items show correctly

**If API returns empty []:**
- ❌ API is NOT returning items from database
- **Go to: Reason #2 or #3**

**If API returns items but UI is empty:**
- ❌ Frontend is NOT displaying returned items
- **Go to: Reason #4**

---

## TEST 3: Check Your User Role & Permissions

In browser console:

```javascript
// Check what role you're logged in as
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('Your role:', user.role);

// Check what inventory types this role can see
const allowedTypes = {
  'admin': ['kitchen', 'bar', 'housekeeping', 'minibar'],
  'manager': ['kitchen', 'bar', 'housekeeping', 'minibar'],
  'kitchen_staff': ['kitchen'],
  'receptionist': ['bar', 'housekeeping', 'minibar'],
  'waiter': ['bar'],
  'quick_pos': ['bar']
};

console.log('Your allowed types:', allowedTypes[user.role] || []);
```

**If you only see 'kitchen' or 'bar' items:**
- ✅ This is working as designed (role-based filtering)
- Upload items might be for a type you can't see
- **Solution:** Upload items matching your allowed types

---

## TEST 4: Trace Upload Process

Watch the server console while uploading:

```
Expected to see messages like:

📦 Starting inventory upload, file: inventory_updated_with_prices.csv
📊 Parsed rows: 134
📥 Items to insert: 134
📤 Items to update: 0
🔍 Sample insert item: { name: '4TH STREET...', ... }
✅ Inserted items result: [array of IDs]
🔢 Total items in DB after upload: { count: 456 }
```

**If you DON'T see these messages:**
- ❌ Upload is failing silently
- Check browser Network tab for errors
- **Go to: Reason #1**

**If you see them but "Items in DB" stays same:**
- ❌ Transaction rolled back or items are being soft-deleted
- **Go to: Reason #1**

---

## Possible Reasons & Fixes

### Reason #1: Items Not Being Inserted into Database
**Symptoms:** Database count unchanged, upload shows "success"

**Likely Cause:**
- CSV parsing failed silently
- Transaction rolled back
- Database constraint violation

**Fix:**
```bash
# Check server build is up to date
cd server
npm run build

# Restart server with fresh start
npm run dev
```

**Debug:**
- Look for errors in server console
- Check `/server/dist/controllers/inventoryController.js` exists
- Verify migrations ran: `knex:migrations complete` in startup logs

---

### Reason #2: API Returns Empty Array
**Symptoms:** Database has items, but API returns `[]`

**Likely Cause:**
- `is_active` filter excluding items
- Role-based filtering
- Wrong table join

**Quick Fix:**
```sql
-- Check if items have is_active set correctly
SELECT COUNT(*), is_active FROM inventory_items GROUP BY is_active;

-- Set all to active
UPDATE inventory_items SET is_active = true WHERE is_active IS NULL OR is_active = false;
```

Then refresh the UI.

---

### Reason #3: Role-Based Filtering Blocking Items
**Symptoms:** API works but only shows some types

**Check:**
```sql
-- Check what types are in database
SELECT DISTINCT inventory_type FROM inventory_items;

-- Check your role's allowed types
-- If you're 'receptionist', you can only see: bar, housekeeping, minibar
-- Not: kitchen
```

**Fix:**
- Upload items for types you can see
- Or ask admin to change your role

---

### Reason #4: Frontend Not Displaying Items
**Symptoms:** API returns items in console, but UI shows empty

**Likely Cause:**
- React state not updating
- Component not re-rendering
- CSS hiding items

**Fix:**
```javascript
// In browser console, check component state
// After clicking "Import CSV / Excel", watch:
document.querySelectorAll('table tbody tr').length  // Should show count

// Check if setInventory is being called
// Add breakpoint in InventoryManagement.tsx around line 101
```

---

## Summary: Where to Look

| Symptom | Check First | Then Check |
|---------|------------|-----------|
| Upload says OK, nothing appears | TEST 1 (Database) | TEST 2 (API) |
| Items in DB but API empty | Reason #2 (is_active) | TEST 3 (Role) |
| API returns items but UI empty | Reason #4 (Frontend) | Browser console errors |
| Only see some types | TEST 3 (Role) | CSV upload type values |

---

## Final Check: Server Logs During Upload

Enable detailed logging by adding to server command:

```bash
# Windows PowerShell / CMD
$env:DEBUG=knex:*; npm run dev

# Or check the package.json script
```

Watch for any of these errors:
```
❌ Error processing file
❌ File processing error
❌ Database transaction error
❌ Error creating inventory item
❌ Bulk update error
```

---

## If All Tests Pass but Still Not Working

There may be a frontend refresh issue. Try:

1. Clear browser cache: `Ctrl + Shift + Delete` → Clear all
2. Full page reload: `Ctrl + Shift + R` (hard refresh)
3. Check if new data appears

If still nothing:
- Check browser DevTools Network tab during reload
- Verify API is actually called
- Check if loading spinner appears/disappears
