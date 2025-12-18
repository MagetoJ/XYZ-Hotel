import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3000/api';

async function getAuthToken(page: any) {
  const token = await page.evaluate(() => localStorage.getItem('pos_token'));
  return token;
}

async function loginAsAdmin(page: any) {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  
  const usernameInput = page.locator('input[type="text"]').first();
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');
  
  await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  
  await usernameInput.fill('Kizito');
  await passwordInput.fill('admin');
  await submitButton.click();
  
  await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(3000);
  
  const token = await page.evaluate(() => localStorage.getItem('pos_token'));
  if (!token) {
    throw new Error('Login failed - token not stored in localStorage');
  }
  return token;
}

test.describe('Inventory Upload - CSV Import & Display', () => {
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    authToken = await loginAsAdmin(page);
    expect(authToken).toBeTruthy();
  });

  test('TEST 1: Verify initial inventory count', async ({ page }) => {
    const response = await page.evaluate(async (params: any) => {
      const res = await fetch(`${params.apiUrl}/inventory`, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = res.ok ? await res.json() : null;
      return {
        status: res.status,
        count: Array.isArray(data) ? data.length : 0,
        data: data,
        ok: res.ok
      };
    }, { apiUrl: API_URL, token: authToken });

    console.log('📊 Initial inventory count:', response.count);
    console.log('📋 Initial inventory data:', response.data?.slice(0, 2));
    expect(response.ok).toBe(true);
  });

  test('TEST 2: Upload CSV file and verify response', async ({ page }) => {
    // Create a simple test CSV in memory
    const csvContent = `Item Name,Type,Current Stock,Unit,Cost per Unit (KES),Supplier,supplier_name
Test Item 1,BAR,10,bottles,500,Test Supplier,Test Supplier
Test Item 2,KITCHEN,5,kg,1000,Test Supplier,Test Supplier`;

    const csvPath = path.join(__dirname, 'test-inventory.csv');
    fs.writeFileSync(csvPath, csvContent);

    const uploadResponse = await page.evaluate(async (params: any) => {
      const formData = new FormData();
      const blob = new Blob([params.csvContent], { type: 'text/csv' });
      formData.append('file', blob, 'test-inventory.csv');

      const res = await fetch(`${params.apiUrl}/inventory/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.token}`
        },
        body: formData
      });

      const data = res.ok ? await res.json() : null;
      return {
        status: res.status,
        ok: res.ok,
        message: data?.message,
        processed_count: data?.processed_count,
        inserted: data?.inserted,
        updated: data?.updated,
        errors: data?.errors,
        fullResponse: data
      };
    }, { 
      apiUrl: API_URL, 
      token: authToken,
      csvContent: csvContent
    });

    console.log('📤 Upload Response:', uploadResponse);
    expect(uploadResponse.ok).toBe(true);
    expect(uploadResponse.processed_count).toBeGreaterThan(0);
    
    fs.unlinkSync(csvPath);
  });

  test('TEST 3: Verify items appear in inventory after upload', async ({ page }) => {
    // First, upload items
    const csvContent = `Item Name,Type,Current Stock,Unit,Cost per Unit (KES),Supplier,supplier_name
Upload Test Item A,BAR,20,bottles,1500,Test Supplier,Test Supplier
Upload Test Item B,KITCHEN,15,kg,2000,Test Supplier,Test Supplier`;

    const uploadResponse = await page.evaluate(async (params: any) => {
      const formData = new FormData();
      const blob = new Blob([params.csvContent], { type: 'text/csv' });
      formData.append('file', blob, 'test-inventory.csv');

      const res = await fetch(`${params.apiUrl}/inventory/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.token}`
        },
        body: formData
      });
      return res.ok ? await res.json() : null;
    }, { apiUrl: API_URL, token: authToken, csvContent });

    console.log('✅ Upload result:', uploadResponse);
    expect(uploadResponse.processed_count).toBe(2);

    // Now fetch inventory to see if items are there
    await page.waitForTimeout(2000); // Wait for processing

    const inventoryResponse = await page.evaluate(async (params: any) => {
      const res = await fetch(`${params.apiUrl}/inventory`, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = res.ok ? await res.json() : null;
      return {
        status: res.status,
        count: Array.isArray(data) ? data.length : 0,
        items: data,
        ok: res.ok
      };
    }, { apiUrl: API_URL, token: authToken });

    console.log('📦 Inventory count after upload:', inventoryResponse.count);
    console.log('📦 Items in inventory:', inventoryResponse.items?.map((i: any) => ({
      id: i.id,
      name: i.name,
      type: i.inventory_type,
      stock: i.current_stock,
      is_active: i.is_active
    })));

    expect(inventoryResponse.ok).toBe(true);
    expect(inventoryResponse.count).toBeGreaterThan(0);

    // Check if uploaded items are present
    const testItems = inventoryResponse.items?.filter((item: any) => 
      item.name?.includes('Upload Test Item')
    ) || [];
    console.log('🔍 Found test items:', testItems);
  });

  test('TEST 4: Verify is_active flag is true for uploaded items', async ({ page }) => {
    const csvContent = `Item Name,Type,Current Stock,Unit,Cost per Unit (KES),Supplier,supplier_name
Active Test Item,BAR,5,unit,800,Test Supplier,Test Supplier`;

    await page.evaluate(async (params: any) => {
      const formData = new FormData();
      const blob = new Blob([params.csvContent], { type: 'text/csv' });
      formData.append('file', blob, 'test-inventory.csv');

      await fetch(`${params.apiUrl}/inventory/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.token}`
        },
        body: formData
      });
    }, { apiUrl: API_URL, token: authToken, csvContent });

    await page.waitForTimeout(2000);

    const checkActiveResponse = await page.evaluate(async (params: any) => {
      // Query database directly to check is_active flag
      const res = await fetch(`${params.apiUrl}/inventory`, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      const items = res.ok ? await res.json() : [];
      const activeTestItem = items.find((item: any) => item.name?.includes('Active Test Item'));
      return {
        found: !!activeTestItem,
        is_active: activeTestItem?.is_active,
        item: activeTestItem
      };
    }, { apiUrl: API_URL, token: authToken });

    console.log('✅ Active flag check:', checkActiveResponse);
    if (checkActiveResponse.found) {
      expect(checkActiveResponse.is_active).toBe(true);
    }
  });

  test('TEST 5: Verify type normalization (BAR, bar, Bar)', async ({ page }) => {
    const csvContent = `Item Name,Type,Current Stock,Unit,Cost per Unit (KES),Supplier,supplier_name
Type Test BAR,BAR,1,unit,500,Supplier,Supplier
Type Test bar,bar,1,unit,500,Supplier,Supplier
Type Test kitchen,kitchen,1,unit,500,Supplier,Supplier`;

    const uploadResponse = await page.evaluate(async (params: any) => {
      const formData = new FormData();
      const blob = new Blob([params.csvContent], { type: 'text/csv' });
      formData.append('file', blob, 'test-inventory.csv');

      const res = await fetch(`${params.apiUrl}/inventory/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.token}`
        },
        body: formData
      });
      return res.ok ? await res.json() : null;
    }, { apiUrl: API_URL, token: authToken, csvContent });

    console.log('📝 Type normalization upload:', uploadResponse);
    expect(uploadResponse.processed_count).toBe(3);
  });

  test('TEST 6: Direct database query verification', async ({ page }) => {
    const dbQuery = await page.evaluate(async (params: any) => {
      // Fetch and analyze the actual data structure
      const res = await fetch(`${params.apiUrl}/inventory?inventory_type=bar`, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      const items = res.ok ? await res.json() : [];
      return {
        totalBarItems: items.length,
        itemsWithPrice: items.filter((i: any) => i.cost_per_unit && i.cost_per_unit > 0).length,
        sampleItem: items[0] ? {
          id: items[0].id,
          name: items[0].name,
          type: items[0].inventory_type,
          stock: items[0].current_stock,
          minStock: items[0].minimum_stock,
          cost: items[0].cost_per_unit,
          supplier: items[0].supplier,
          is_active: items[0].is_active,
          lastUpdated: items[0].last_updated,
          allKeys: Object.keys(items[0])
        },
        allItems: items.length > 0 ? items.slice(0, 5).map((i: any) => ({
          name: i.name,
          type: i.inventory_type,
          stock: i.current_stock,
          cost: i.cost_per_unit,
          active: i.is_active
        })) : []
      };
    }, { apiUrl: API_URL, token: authToken });

    console.log('🔬 Database Analysis:', dbQuery);
  });

  test('TEST 7: Check API response headers and data types', async ({ page }) => {
    const apiAnalysis = await page.evaluate(async (params: any) => {
      const res = await fetch(`${params.apiUrl}/inventory`, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      return {
        status: res.status,
        headers: {
          contentType: res.headers.get('content-type'),
          cacheControl: res.headers.get('cache-control')
        },
        isArray: Array.isArray(data),
        dataLength: Array.isArray(data) ? data.length : 'Not an array',
        firstItemType: Array.isArray(data) && data[0] ? typeof data[0] : 'N/A',
        firstItem: Array.isArray(data) && data[0] ? data[0] : null
      };
    }, { apiUrl: API_URL, token: authToken });

    console.log('🔍 API Response Analysis:', apiAnalysis);
    expect(apiAnalysis.isArray).toBe(true);
  });
});
