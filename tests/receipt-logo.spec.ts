import { test, expect } from '@playwright/test';

test.describe('Receipt Logo Display', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Login with default credentials (adjust as needed)
    // Note: This might need to be adjusted based on your actual login flow
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin');
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForLoadState('networkidle');
  });

  test('should display logo in POS order receipt preview', async ({ page }) => {
    // Navigate to POS interface
    await page.click('text=POS');
    await page.waitForLoadState('networkidle');
    
    // Add an item to the order (adjust selector based on actual UI)
    const firstMenuItem = page.locator('.menu-item, [data-testid="menu-item"]').first();
    if (await firstMenuItem.count() > 0) {
      await firstMenuItem.click();
    }
    
    // Click finalize order button
    await page.click('button:has-text("Finalize Order"), button:has-text("Place Order")');
    
    // Select a waiter (if needed)
    const waiterSelect = page.locator('select');
    if (await waiterSelect.count() > 0) {
      await waiterSelect.selectOption({ index: 0 });
    }
    
    // Enter PIN (adjust based on actual PIN requirements)
    await page.fill('input[type="password"], input[placeholder*="PIN"]', '1234');
    
    // Submit the order
    await page.click('button:has-text("Submit"), button:has-text("Confirm")');
    
    // Wait for receipt modal to appear
    await page.waitForSelector('text=Receipt Preview', { timeout: 10000 });
    
    // Verify logo is present in the preview
    const logoInPreview = page.locator('img[src="/logo.PNG"], img[alt*="Restaurant Logo"]');
    await expect(logoInPreview).toBeVisible();
    
    // Verify logo has correct attributes
    await expect(logoInPreview).toHaveAttribute('src', '/logo.PNG');
    await expect(logoInPreview).toHaveAttribute('alt', 'Restaurant Logo');
  });

  test('should display logo in receptionist bar sales receipt', async ({ page }) => {
    // Navigate to receptionist interface
    await page.click('text=Receptionist');
    await page.waitForLoadState('networkidle');
    
    // Go to bar sales
    await page.click('text=Bar Sales');
    await page.waitForLoadState('networkidle');
    
    // Select an item for sale (adjust selectors as needed)
    const saleButton = page.locator('button:has-text("Sale"), .sale-button').first();
    if (await saleButton.count() > 0) {
      await saleButton.click();
      
      // Fill sale details
      await page.fill('input[type="number"]', '1');
      await page.selectOption('select', { index: 0 }); // Payment method
      
      // Complete the sale
      await page.click('button:has-text("Complete Sale"), button:has-text("Confirm Sale")');
      
      // Wait for receipt modal
      await page.waitForSelector('text=Receipt Preview', { timeout: 10000 });
      
      // Verify logo is present in the preview
      const logoInPreview = page.locator('img[src="/logo.PNG"], img[alt*="Restaurant Logo"]');
      await expect(logoInPreview).toBeVisible();
      
      // Verify logo has correct attributes
      await expect(logoInPreview).toHaveAttribute('src', '/logo.PNG');
      await expect(logoInPreview).toHaveAttribute('alt', 'Restaurant Logo');
    }
  });

  test('should include logo in print receipt HTML', async ({ page }) => {
    // Set up to capture new pages (print windows)
    const printPagePromise = page.context().waitForEvent('page');
    
    // Navigate to POS and create an order (similar to first test)
    await page.click('text=POS');
    await page.waitForLoadState('networkidle');
    
    const firstMenuItem = page.locator('.menu-item, [data-testid="menu-item"]').first();
    if (await firstMenuItem.count() > 0) {
      await firstMenuItem.click();
    }
    
    await page.click('button:has-text("Finalize Order"), button:has-text("Place Order")');
    
    const waiterSelect = page.locator('select');
    if (await waiterSelect.count() > 0) {
      await waiterSelect.selectOption({ index: 0 });
    }
    
    await page.fill('input[type="password"], input[placeholder*="PIN"]', '1234');
    await page.click('button:has-text("Submit"), button:has-text("Confirm")');
    
    // Wait for receipt modal
    await page.waitForSelector('text=Receipt Preview', { timeout: 10000 });
    
    // Click print button to trigger print window
    await page.click('button:has-text("Print Receipt"), button:has-text("Print")');
    
    // Wait for print window to open
    const printPage = await printPagePromise;
    await printPage.waitForLoadState('networkidle');
    
    // Verify logo is present in the print HTML
    const logoInPrint = printPage.locator('img[src="/logo.PNG"], img.logo');
    await expect(logoInPrint).toBeVisible();
    
    // Verify the logo has the correct styling
    await expect(logoInPrint).toHaveCSS('display', 'block');
    await expect(logoInPrint).toHaveCSS('margin', '0px auto 10px');
    
    // Check that the restaurant name is present alongside the logo
    await expect(printPage.locator('text=MARIA HAVENS')).toBeVisible();
    
    // Close the print window
    await printPage.close();
  });

  test('should handle missing logo gracefully', async ({ page }) => {
    // Intercept the logo request and make it fail
    await page.route('**/logo.PNG', route => {
      route.abort('failed');
    });
    
    // Navigate to POS and create an order
    await page.click('text=POS');
    await page.waitForLoadState('networkidle');
    
    const firstMenuItem = page.locator('.menu-item, [data-testid="menu-item"]').first();
    if (await firstMenuItem.count() > 0) {
      await firstMenuItem.click();
    }
    
    await page.click('button:has-text("Finalize Order"), button:has-text("Place Order")');
    
    const waiterSelect = page.locator('select');
    if (await waiterSelect.count() > 0) {
      await waiterSelect.selectOption({ index: 0 });
    }
    
    await page.fill('input[type="password"], input[placeholder*="PIN"]', '1234');
    await page.click('button:has-text("Submit"), button:has-text("Confirm")');
    
    // Wait for receipt modal
    await page.waitForSelector('text=Receipt Preview', { timeout: 10000 });
    
    // Even if logo fails to load, receipt should still be functional
    await expect(page.locator('text=MARIA HAVENS')).toBeVisible();
    await expect(page.locator('button:has-text("Print Receipt"), button:has-text("Print")')).toBeVisible();
  });

  test('should verify logo loads before printing', async ({ page }) => {
    // Set up to capture new pages (print windows)
    const printPagePromise = page.context().waitForEvent('page');
    
    // Navigate and create order
    await page.click('text=POS');
    await page.waitForLoadState('networkidle');
    
    const firstMenuItem = page.locator('.menu-item, [data-testid="menu-item"]').first();
    if (await firstMenuItem.count() > 0) {
      await firstMenuItem.click();
    }
    
    await page.click('button:has-text("Finalize Order"), button:has-text("Place Order")');
    
    const waiterSelect = page.locator('select');
    if (await waiterSelect.count() > 0) {
      await waiterSelect.selectOption({ index: 0 });
    }
    
    await page.fill('input[type="password"], input[placeholder*="PIN"]', '1234');
    await page.click('button:has-text("Submit"), button:has-text("Confirm")');
    
    await page.waitForSelector('text=Receipt Preview', { timeout: 10000 });
    
    // Click print and verify the logo loading script is executed
    await page.click('button:has-text("Print Receipt"), button:has-text("Print")');
    
    const printPage = await printPagePromise;
    await printPage.waitForLoadState('networkidle');
    
    // Verify the script content includes logo loading logic
    const scriptContent = await printPage.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.find(script => script.textContent?.includes('logo.onload'))?.textContent || '';
    });
    
    expect(scriptContent).toContain('logo.onload');
    expect(scriptContent).toContain('logo.complete');
    
    await printPage.close();
  });
});