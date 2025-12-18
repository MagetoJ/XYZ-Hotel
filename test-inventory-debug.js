#!/usr/bin/env node

/**
 * Diagnostic script to test inventory upload flow
 * Run with: node test-inventory-debug.js
 */

const db = require('./server/dist/db').default || require('./server/src/db').default;
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

async function runDiagnostics() {
  console.log('🔍 INVENTORY UPLOAD DIAGNOSTIC TEST');
  console.log('=====================================\n');

  try {
    // TEST 1: Check database connection
    console.log('TEST 1: Checking database connection...');
    try {
      const result = await db.raw('SELECT 1+1 as result');
      console.log('✅ Database connected successfully\n');
    } catch (err) {
      console.log('❌ Database connection failed:', err.message, '\n');
      throw err;
    }

    // TEST 2: Check inventory_items table exists and structure
    console.log('TEST 2: Checking inventory_items table structure...');
    try {
      const hasTable = await db.schema.hasTable('inventory_items');
      if (!hasTable) {
        console.log('❌ inventory_items table does not exist\n');
        throw new Error('Table missing');
      }
      
      const columns = await db.raw(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'inventory_items'
        ORDER BY ordinal_position
      `);
      
      console.log('✅ inventory_items table exists with columns:');
      if (columns.rows) {
        columns.rows.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
        });
      }
      console.log('');
    } catch (err) {
      console.log('❌ Error checking table:', err.message, '\n');
    }

    // TEST 3: Count existing items
    console.log('TEST 3: Counting existing inventory items...');
    try {
      const countResult = await db('inventory_items').count('* as count').first();
      const count = countResult?.count || 0;
      console.log(`✅ Found ${count} items in inventory_items table\n`);
    } catch (err) {
      console.log('❌ Error counting items:', err.message, '\n');
    }

    // TEST 4: Check is_active filtering
    console.log('TEST 4: Checking is_active flag status...');
    try {
      const activeCount = await db('inventory_items').where('is_active', true).count('* as count').first();
      const inactiveCount = await db('inventory_items').where('is_active', false).count('* as count').first();
      const nullCount = await db('inventory_items').whereNull('is_active').count('* as count').first();
      
      console.log(`✅ Active items: ${activeCount?.count || 0}`);
      console.log(`✅ Inactive items: ${inactiveCount?.count || 0}`);
      console.log(`✅ NULL is_active: ${nullCount?.count || 0}\n`);
    } catch (err) {
      console.log('❌ Error checking is_active:', err.message, '\n');
    }

    // TEST 5: Sample data check
    console.log('TEST 5: Sample inventory data...');
    try {
      const items = await db('inventory_items').limit(3).select('*');
      console.log(`✅ Sample items (first 3):`);
      items.forEach((item, idx) => {
        console.log(`   Item ${idx + 1}:`);
        console.log(`     - ID: ${item.id}`);
        console.log(`     - Name: ${item.name}`);
        console.log(`     - Type: ${item.inventory_type}`);
        console.log(`     - Stock: ${item.current_stock}`);
        console.log(`     - Cost: ${item.cost_per_unit}`);
        console.log(`     - Supplier: ${item.supplier}`);
        console.log(`     - Active: ${item.is_active}`);
        console.log(`     - Keys: ${Object.keys(item).join(', ')}`);
      });
      console.log('');
    } catch (err) {
      console.log('❌ Error fetching samples:', err.message, '\n');
    }

    // TEST 6: Parse CSV file
    console.log('TEST 6: Parsing your CSV file...');
    const csvPath = 'C:\\Users\\DELL\\Downloads\\inventory_updated_with_prices.csv';
    
    if (!fs.existsSync(csvPath)) {
      console.log(`❌ CSV file not found at: ${csvPath}\n`);
    } else {
      try {
        const workbook = XLSX.readFile(csvPath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log(`✅ CSV parsed successfully`);
        console.log(`   - Sheet name: ${sheetName}`);
        console.log(`   - Total rows: ${jsonData.length}`);
        console.log(`   - Column headers: ${Object.keys(jsonData[0] || {}).join(', ')}\n`);
        
        // TEST 7: Simulate upload logic
        console.log('TEST 7: Simulating upload parsing logic...');
        
        const findValue = (row, ...possibleHeaders) => {
          for (const header of possibleHeaders) {
            const foundKey = Object.keys(row).find(k => 
              k.toLowerCase().trim() === header.toLowerCase().trim()
            );
            if (foundKey && row[foundKey]) {
              return String(row[foundKey]).trim();
            }
          }
          return undefined;
        };
        
        const parseNumber = (value) => {
          if (!value) return 0;
          const str = String(value)
            .trim()
            .replace(/,/g, '')
            .replace(/"/g, '')
            .replace(/\s+/g, '')
            .replace(/-/g, '0');
          const num = parseFloat(str);
          return isNaN(num) ? 0 : Math.max(0, num);
        };
        
        let validItems = 0;
        let invalidItems = 0;
        const parsedItems = [];
        
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i];
          const name = findValue(row, 'Item Name', 'Name', 'Product', 'Item');
          const stock = parseNumber(findValue(row, 'Current Stock', 'Stock', 'Quantity', 'Qty'));
          const cost = parseNumber(findValue(row, 'Cost per Unit (KES)', 'Cost Per Unit (KES)', 'Cost', 'Price'));
          const unit = findValue(row, 'Unit', 'Measurement') || 'unit';
          const supplier = findValue(row, 'Supplier', 'Vendor', 'supplier_name') || 'Unknown';
          const typeRaw = findValue(row, 'Type', 'Category', 'inventory_type');
          const typeNormalized = typeRaw ? typeRaw.toLowerCase().trim() : 'bar';
          const validTypes = ['kitchen', 'bar', 'housekeeping', 'minibar'];
          const type = validTypes.includes(typeNormalized) ? typeNormalized : 'bar';
          
          if (name) {
            validItems++;
            parsedItems.push({ name, stock, cost, unit, supplier, type });
            console.log(`   ✅ Row ${i + 1}: ${name}`);
            console.log(`      Stock: ${stock}, Cost: ${cost}, Type: ${type}`);
          } else {
            invalidItems++;
            console.log(`   ❌ Row ${i + 1}: No item name found`);
          }
        }
        
        console.log(`\n✅ Parse simulation complete:`);
        console.log(`   - Valid items: ${validItems}`);
        console.log(`   - Invalid items: ${invalidItems}\n`);
        
      } catch (err) {
        console.log('❌ Error parsing CSV:', err.message, '\n');
      }
    }

    // TEST 8: Test INSERT simulation
    console.log('TEST 8: Testing INSERT operation...');
    try {
      const testItem = {
        name: `TEST_${Date.now()}`,
        unit: 'unit',
        current_stock: 100,
        minimum_stock: 5,
        cost_per_unit: 500,
        supplier: 'Test Supplier',
        inventory_type: 'bar',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const [insertedId] = await db('inventory_items').insert(testItem).returning('id');
      console.log(`✅ Test item inserted with ID: ${insertedId}\n`);
      
      // Verify it can be fetched
      const verifyItem = await db('inventory_items').where('id', insertedId).first();
      console.log('TEST 9: Verifying inserted item...');
      if (verifyItem) {
        console.log(`✅ Item verified:`);
        console.log(`   - Name: ${verifyItem.name}`);
        console.log(`   - Stock: ${verifyItem.current_stock}`);
        console.log(`   - Type: ${verifyItem.inventory_type}`);
        console.log(`   - Active: ${verifyItem.is_active}\n`);
        
        // Now delete it
        await db('inventory_items').where('id', insertedId).del();
        console.log('✅ Test item cleaned up\n');
      } else {
        console.log('❌ Inserted item could not be retrieved\n');
      }
    } catch (err) {
      console.log('❌ Error in INSERT test:', err.message, '\n');
    }

    // TEST 10: Test getInventory query
    console.log('TEST 10: Testing getInventory query (like API)...');
    try {
      const query = db('inventory_items').where('is_active', true);
      
      const items = await query;
      console.log(`✅ Query returned ${items.length} items`);
      console.log(`   Items sample:`, items.slice(0, 2).map(i => ({
        name: i.name,
        type: i.inventory_type,
        stock: i.current_stock
      })));
      console.log('');
    } catch (err) {
      console.log('❌ Error in getInventory test:', err.message, '\n');
    }

    console.log('✅ DIAGNOSTICS COMPLETE');
    process.exit(0);

  } catch (err) {
    console.error('❌ FATAL ERROR:', err);
    process.exit(1);
  }
}

runDiagnostics();
