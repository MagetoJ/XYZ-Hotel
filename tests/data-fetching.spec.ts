import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:3000/api';

// Helper function to get auth token
async function getAuthToken(page: any) {
  // This will be obtained from localStorage after login
  const token = await page.evaluate(() => localStorage.getItem('pos_token'));
  return token;
}

test.describe('Data Fetching - Staff Performance, Expenses, and Product Returns', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for login form to be visible
    await page.waitForTimeout(1000);
    
    // Find and fill the login form
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // Make sure inputs exist before filling
    await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Fill and submit login form
    await usernameInput.fill('Kizito');
    await passwordInput.fill('admin');
    await submitButton.click();
    
    // Wait for navigation to complete and token to be stored
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(3000); // Give extra time for token storage
    
    // Verify token was stored
    const token = await page.evaluate(() => localStorage.getItem('pos_token'));
    if (!token) {
      throw new Error('Login failed - token not stored in localStorage');
    }
  });

  test('should fetch staff performance data successfully', async ({ page }) => {
    const token = await getAuthToken(page);
    expect(token).toBeTruthy();

    // Calculate date range
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Test individual staff performance endpoint
    const response = await page.evaluate(async (params: any) => {
      const url = `${params.apiUrl}/performance/staff/1?start_date=${params.startDate}&end_date=${params.endDate}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        status: res.status,
        data: res.ok ? await res.json() : null,
        ok: res.ok
      };
    }, { 
      apiUrl: API_URL, 
      token, 
      startDate, 
      endDate 
    });

    // Verify the response
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    expect(response.data).toBeTruthy();
    
    // Verify response structure
    if (response.data) {
      expect(response.data.period).toBeDefined();
      expect(response.data.orders).toBeDefined();
      expect(response.data.financial).toBeDefined();
      expect(response.data.service).toBeDefined();
      expect(response.data.attendance).toBeDefined();
    }
  });

  test('should fetch all staff performance data (admin only)', async ({ page }) => {
    const token = await getAuthToken(page);
    expect(token).toBeTruthy();

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Test all staff performance endpoint
    const response = await page.evaluate(async (params: any) => {
      const url = `${params.apiUrl}/performance/all?start_date=${params.startDate}&end_date=${params.endDate}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        status: res.status,
        data: res.ok ? await res.json() : null,
        ok: res.ok
      };
    }, { 
      apiUrl: API_URL, 
      token, 
      startDate, 
      endDate 
    });

    // Verify the response
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
  });

  test('should fetch waiter performance data (receptionist access)', async ({ page }) => {
    const token = await getAuthToken(page);
    expect(token).toBeTruthy();

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Test waiter performance endpoint
    const response = await page.evaluate(async (params: any) => {
      const url = `${params.apiUrl}/performance/waiters?start_date=${params.startDate}&end_date=${params.endDate}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        status: res.status,
        data: res.ok ? await res.json() : null,
        ok: res.ok
      };
    }, { 
      apiUrl: API_URL, 
      token, 
      startDate, 
      endDate 
    });

    // Verify the response is either successful or returns 403 (if not authorized)
    expect([200, 403]).toContain(response.status);
  });

  test('should fetch expenses data', async ({ page }) => {
    const token = await getAuthToken(page);
    expect(token).toBeTruthy();

    // Test expenses endpoint
    const response = await page.evaluate(async (params: any) => {
      const url = `${params.apiUrl}/expenses`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        status: res.status,
        data: res.ok ? await res.json() : null,
        ok: res.ok
      };
    }, { 
      apiUrl: API_URL, 
      token 
    });

    // Verify the response
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
  });

  test('should fetch expenses summary data', async ({ page }) => {
    const token = await getAuthToken(page);
    expect(token).toBeTruthy();

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    // Test expenses summary endpoint - this was previously broken due to route ordering
    const response = await page.evaluate(async (params: any) => {
      const url = `${params.apiUrl}/expenses/summary?startDate=${params.startDate}&endDate=${params.endDate}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        status: res.status,
        data: res.ok ? await res.json() : null,
        ok: res.ok
      };
    }, { 
      apiUrl: API_URL, 
      token, 
      startDate, 
      endDate 
    });

    // Verify the response
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    expect(response.data).toBeTruthy();
    expect(response.data.byCategory).toBeDefined();
    expect(response.data.total).toBeDefined();
  });

  test('should fetch product returns data', async ({ page }) => {
    const token = await getAuthToken(page);
    expect(token).toBeTruthy();

    // Test product returns endpoint
    const response = await page.evaluate(async (params: any) => {
      const url = `${params.apiUrl}/product-returns`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        status: res.status,
        data: res.ok ? await res.json() : null,
        ok: res.ok
      };
    }, { 
      apiUrl: API_URL, 
      token 
    });

    // Verify the response
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
  });

  test('should fetch product returns summary data', async ({ page }) => {
    const token = await getAuthToken(page);
    expect(token).toBeTruthy();

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    // Test product returns summary endpoint - this was previously broken due to route ordering
    const response = await page.evaluate(async (params: any) => {
      const url = `${params.apiUrl}/product-returns/summary?startDate=${params.startDate}&endDate=${params.endDate}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        status: res.status,
        data: res.ok ? await res.json() : null,
        ok: res.ok
      };
    }, { 
      apiUrl: API_URL, 
      token, 
      startDate, 
      endDate 
    });

    // Verify the response
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    expect(response.data).toBeTruthy();
    expect(response.data.byReason).toBeDefined();
    expect(response.data.totalReturnValue).toBeDefined();
  });

  test('should return 401 for unauthenticated requests', async ({ page }) => {
    // Test staff performance without token
    const response = await page.evaluate(async (params: any) => {
      const url = `${params.apiUrl}/performance/staff/1`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return {
        status: res.status,
        ok: res.ok
      };
    }, { 
      apiUrl: API_URL 
    });

    // Should be unauthorized
    expect(response.status).toBe(401);
    expect(response.ok).toBe(false);
  });

  test('should handle route parameter conflicts correctly', async ({ page }) => {
    const token = await getAuthToken(page);
    expect(token).toBeTruthy();

    // Test that /summary endpoint is reached correctly (not treated as ID parameter)
    const summaryResponse = await page.evaluate(async (params: any) => {
      const url = `${params.apiUrl}/expenses/summary`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        status: res.status,
        ok: res.ok,
        data: res.ok ? await res.json() : null
      };
    }, { 
      apiUrl: API_URL, 
      token 
    });

    // Verify summary endpoint is reached and not treating "summary" as an ID
    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.ok).toBe(true);
    expect(summaryResponse.data).toBeTruthy();
    expect(summaryResponse.data.byCategory).toBeDefined();
    
    // Test that numeric IDs still work
    const idResponse = await page.evaluate(async (params: any) => {
      const url = `${params.apiUrl}/expenses/999`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        status: res.status,
        ok: res.ok,
        message: res.ok ? 'Found' : 'Not Found'
      };
    }, { 
      apiUrl: API_URL, 
      token 
    });

    // Non-existent ID should return 404, not treat "999" as "summary"
    expect(idResponse.status).toBe(404);
  });
});