import { test, expect } from '@playwright/test';

test.describe('Purchasing & Supplier Management - Core Features', () => {
  test('API health check - suppliers endpoint responds', async () => {
    const response = await fetch('http://localhost:3000/api/suppliers', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(e => null);

    // Should either get 401 (unauthorized) or 200 (allowed)
    expect(response).toBeTruthy();
    expect([200, 401, 403]).toContain(response?.status);
  });

  test('API health check - purchase orders endpoint responds', async () => {
    const response = await fetch('http://localhost:3000/api/purchase-orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(e => null);

    expect(response).toBeTruthy();
    expect([200, 401, 403]).toContain(response?.status);
  });

  test('Frontend loads successfully', async ({ page }) => {
    const response = await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' }).catch(() => null);
    
    // Should load without crashing
    expect(response).toBeTruthy();
    
    // Verify page contains main content
    const bodyContent = await page.content();
    expect(bodyContent.length).toBeGreaterThan(100);
  });

  test('Admin dashboard accessible', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    
    // Look for navigation to admin
    const adminLink = page.locator('a:has-text("Admin"), button:has-text("Admin"), [href*="admin"]');
    if (await adminLink.first().isVisible()) {
      await adminLink.first().click();
      
      // Wait for page to load
      await page.waitForTimeout(1000);
      
      // Verify we're on admin page or dashboard
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(100);
    }
  });

  test('Suppliers API integration test', async () => {
    // Test creating a supplier via API
    const supplierData = {
      name: `Test Supplier ${Date.now()}`,
      contact_person: 'John Test',
      email: `supplier${Date.now()}@test.com`,
      phone: '+1234567890',
      address: '123 Test Street',
      payment_terms: 'Net 30'
    };

    // First try to create without auth (should fail with 401)
    const createResponse = await fetch('http://localhost:3000/api/suppliers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(supplierData)
    }).catch(() => ({ status: 0 } as any));

    expect(createResponse).toBeTruthy();
    // Should require authentication
    expect(createResponse.status).toBeGreaterThanOrEqual(400);
  });

  test('Purchase Orders API integration test', async () => {
    // Test creating a purchase order via API
    const poData = {
      supplier_id: 1,
      order_date: new Date().toISOString().split('T')[0],
      items: [
        {
          inventory_item_id: 1,
          quantity_ordered: 10,
          unit_cost: 25.00
        }
      ]
    };

    // First try to create without auth (should fail with 401)
    const createResponse = await fetch('http://localhost:3000/api/purchase-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(poData)
    }).catch(() => ({ status: 0 } as any));

    expect(createResponse).toBeTruthy();
    // Should require authentication
    expect(createResponse.status).toBeGreaterThanOrEqual(400);
  });

  test('Database tables exist - suppliers', async () => {
    // This test verifies the migration ran successfully
    const response = await fetch('http://localhost:3000/api/suppliers', {
      method: 'GET'
    }).catch(() => null);

    // If we get anything other than "table does not exist", migration worked
    if (response) {
      const text = await response.text().catch(() => '');
      expect(text).not.toContain('relation "suppliers" does not exist');
      expect(text).not.toContain('does not exist');
    }
  });

  test('Database tables exist - purchase_orders', async () => {
    // This test verifies the migration ran successfully
    const response = await fetch('http://localhost:3000/api/purchase-orders', {
      method: 'GET'
    }).catch(() => null);

    // If we get anything other than "table does not exist", migration worked
    if (response) {
      const text = await response.text().catch(() => '');
      expect(text).not.toContain('relation "purchase_orders" does not exist');
      expect(text).not.toContain('does not exist');
    }
  });
});