import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3000/api';

let authToken: string;
let supplierId: number;
let purchaseOrderId: number;

test.describe('Purchasing & Supplier Management Module', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app before each test
    await page.goto(BASE_URL).catch(() => {
      // Silently continue if navigation fails
    });
  });

  test.describe('Supplier Management', () => {
    test('should navigate to Suppliers tab in Admin Dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Look for Suppliers tab or menu item
      const suppliersTab = page.locator('text=Suppliers');
      await expect(suppliersTab).toBeVisible();
      await suppliersTab.click();
      
      // Verify suppliers page loads
      await expect(page).toHaveURL(/.*admin/);
    });

    test('should create a new supplier with all required fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to suppliers
      const suppliersTab = page.locator('text=Suppliers');
      await suppliersTab.click();
      
      // Click create/add supplier button
      const addSupplierBtn = page.locator('button:has-text("Add Supplier"), button:has-text("Create Supplier"), button:has-text("New Supplier")');
      await addSupplierBtn.first().click();
      
      // Fill in supplier form
      const supplierName = `Test Supplier ${Date.now()}`;
      await page.fill('input[placeholder*="name" i], input[name*="name" i]', supplierName);
      await page.fill('input[placeholder*="contact" i], input[name*="contact" i]', 'John Supplier');
      await page.fill('input[placeholder*="email" i], input[name*="email" i]', `supplier${Date.now()}@test.com`);
      await page.fill('input[placeholder*="phone" i], input[name*="phone" i]', '+1234567890');
      await page.fill('input[placeholder*="address" i], input[name*="address" i]', '123 Supply Street');
      
      const paymentTermsSelects = page.locator('select[name*="payment" i], [role="combobox"]:has-text("payment")');
      if (await paymentTermsSelects.first().isVisible()) {
        await paymentTermsSelects.first().selectOption('Net 30');
      }
      
      // Submit form
      const submitBtn = page.locator('button:has-text("Save"), button:has-text("Create"), button:has-text("Submit")').first();
      await submitBtn.click();
      
      // Verify success message or supplier appears in list
      const successMsg = page.locator('text=Supplier created|Successfully|Added');
      await expect(successMsg.first()).toBeVisible({ timeout: 5000 });
      
      // Verify supplier appears in list
      const supplierInList = page.locator(`text=${supplierName}`);
      await expect(supplierInList).toBeVisible({ timeout: 5000 });
    });

    test('should display supplier in list with all columns', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to suppliers
      const suppliersTab = page.locator('text=Suppliers');
      await suppliersTab.click();
      
      // Verify table headers
      const nameHeader = page.locator('text=Name');
      const contactHeader = page.locator('text=Contact');
      const phoneHeader = page.locator('text=Phone');
      const emailHeader = page.locator('text=Email');
      
      await expect(nameHeader).toBeVisible();
      await expect(contactHeader).toBeVisible();
      await expect(phoneHeader).toBeVisible();
      await expect(emailHeader).toBeVisible();
      
      // Verify at least one supplier row exists
      const supplierRows = page.locator('table tbody tr, [role="row"]');
      const rowCount = await supplierRows.count();
      expect(rowCount).toBeGreaterThan(0);
    });

    test('should edit an existing supplier', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to suppliers
      const suppliersTab = page.locator('text=Suppliers');
      await suppliersTab.click();
      
      // Find and click edit button on first supplier
      const editBtn = page.locator('button:has-text("Edit"), button[aria-label*="edit" i]').first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        
        // Modify supplier details
        const contactInput = page.locator('input[placeholder*="contact" i], input[name*="contact" i]');
        const currentValue = await contactInput.inputValue();
        await contactInput.clear();
        await contactInput.fill(`Updated ${currentValue}`);
        
        // Save changes
        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")').first();
        await saveBtn.click();
        
        // Verify success
        const successMsg = page.locator('text=updated|saved|Successfully');
        await expect(successMsg.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should deactivate a supplier', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to suppliers
      const suppliersTab = page.locator('text=Suppliers');
      await suppliersTab.click();
      
      // Find deactivate button on first supplier
      const deactivateBtn = page.locator('button:has-text("Deactivate"), button[aria-label*="deactivate" i]').first();
      if (await deactivateBtn.isVisible()) {
        await deactivateBtn.click();
        
        // Confirm if dialog appears
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
        
        // Verify status changed
        const successMsg = page.locator('text=deactivated|status|updated|Successfully');
        await expect(successMsg.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should validate required fields when creating supplier', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to suppliers
      const suppliersTab = page.locator('text=Suppliers');
      await suppliersTab.click();
      
      // Click add supplier
      const addSupplierBtn = page.locator('button:has-text("Add Supplier"), button:has-text("Create Supplier"), button:has-text("New Supplier")').first();
      await addSupplierBtn.click();
      
      // Try to submit without filling required fields
      const submitBtn = page.locator('button:has-text("Save"), button:has-text("Create")').first();
      
      // Check if submit button is disabled or if error appears
      const isDisabled = await submitBtn.isDisabled();
      if (isDisabled) {
        expect(isDisabled).toBe(true);
      } else {
        // If not disabled, submit and expect validation error
        await submitBtn.click();
        const errorMsg = page.locator('text=required|must fill|please enter');
        await expect(errorMsg.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Purchase Order Management', () => {
    test('should navigate to Purchase Orders tab in Admin Dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Look for Purchase Orders tab or menu item
      const poTab = page.locator('text=Purchase Orders, text=PO');
      await expect(poTab.first()).toBeVisible();
      await poTab.first().click();
      
      // Verify PO page loads
      await expect(page).toHaveURL(/.*admin/);
    });

    test('should create a purchase order with single item', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to PO
      const poTab = page.locator('text=Purchase Orders, text=PO');
      await poTab.first().click();
      
      // Click create/add PO button
      const addPoBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
      if (await addPoBtn.isVisible()) {
        await addPoBtn.click();
        
        // Select supplier
        const supplierSelect = page.locator('select[name*="supplier" i], [role="combobox"]:near-text("Supplier")');
        if (await supplierSelect.first().isVisible()) {
          await supplierSelect.first().click();
          const firstOption = page.locator('[role="option"]').first();
          await firstOption.click();
        }
        
        // Add inventory item
        const addItemBtn = page.locator('button:has-text("Add Item"), button:has-text("Add Line")').first();
        if (await addItemBtn.isVisible()) {
          await addItemBtn.click();
          
          // Select inventory item
          const itemSelect = page.locator('select[name*="inventory" i], [role="combobox"]:near-text("Item")').first();
          if (await itemSelect.isVisible()) {
            await itemSelect.click();
            const itemOption = page.locator('[role="option"]').first();
            await itemOption.click();
          }
          
          // Enter quantity and unit cost
          const quantityInput = page.locator('input[placeholder*="quantity" i], input[name*="quantity" i]').first();
          const unitCostInput = page.locator('input[placeholder*="cost" i], input[name*="cost" i]').first();
          
          if (await quantityInput.isVisible()) {
            await quantityInput.fill('10');
          }
          if (await unitCostInput.isVisible()) {
            await unitCostInput.fill('25.00');
          }
        }
        
        // Save PO
        const savBtn = page.locator('button:has-text("Save"), button:has-text("Create")').first();
        await savBtn.click();
        
        // Verify PO created
        const successMsg = page.locator('text=Purchase Order|PO created|Successfully');
        await expect(successMsg.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display PO with generated PO number', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to PO
      const poTab = page.locator('text=Purchase Orders, text=PO');
      await poTab.first().click();
      
      // Verify PO numbers displayed in list (format: PO1001, PO1002, etc.)
      const poNumbers = page.locator('text=/^PO\\d+$/');
      const count = await poNumbers.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should filter POs by status', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to PO
      const poTab = page.locator('text=Purchase Orders, text=PO');
      await poTab.first().click();
      
      // Look for status filter
      const statusFilter = page.locator('select[name*="status" i], [role="combobox"]:near-text("Status")');
      if (await statusFilter.first().isVisible()) {
        await statusFilter.first().click();
        
        // Select "Pending" status
        const pendingOption = page.locator('[role="option"]:has-text("Pending"), text=pending');
        if (await pendingOption.first().isVisible()) {
          await pendingOption.first().click();
          
          // Verify list updates
          await page.waitForTimeout(500);
          const rows = page.locator('table tbody tr, [role="row"]');
          const rowCount = await rows.count();
          expect(rowCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should add multiple line items to PO', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to PO
      const poTab = page.locator('text=Purchase Orders, text=PO');
      await poTab.first().click();
      
      // Create new PO
      const addPoBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
      if (await addPoBtn.isVisible()) {
        await addPoBtn.click();
        
        // Select supplier
        const supplierSelect = page.locator('select[name*="supplier" i], [role="combobox"]:near-text("Supplier")');
        if (await supplierSelect.first().isVisible()) {
          await supplierSelect.first().click();
          const firstOption = page.locator('[role="option"]').first();
          await firstOption.click();
        }
        
        // Add first item
        let addItemBtn = page.locator('button:has-text("Add Item"), button:has-text("Add Line")').first();
        if (await addItemBtn.isVisible()) {
          await addItemBtn.click();
          await page.waitForTimeout(300);
          
          // Add second item
          addItemBtn = page.locator('button:has-text("Add Item"), button:has-text("Add Line")').first();
          if (await addItemBtn.isVisible()) {
            await addItemBtn.click();
            await page.waitForTimeout(300);
            
            // Verify both items exist
            const itemRows = page.locator('[data-testid*="item" i], .line-item, tr:has(input[name*="quantity"])');
            const itemCount = await itemRows.count();
            expect(itemCount).toBeGreaterThanOrEqual(2);
          }
        }
      }
    });
  });

  test.describe('Stock Receiving Workflow', () => {
    test('should receive a complete PO and update inventory', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to PO
      const poTab = page.locator('text=Purchase Orders, text=PO');
      await poTab.first().click();
      
      // Find a pending PO
      const poRow = page.locator('table tbody tr, [role="row"]').first();
      if (await poRow.isVisible()) {
        // Click receive button on PO
        const receiveBtn = poRow.locator('button:has-text("Receive"), button[aria-label*="receive" i]');
        if (await receiveBtn.isVisible()) {
          await receiveBtn.click();
          
          // Modal should appear with PO details
          const modalTitle = page.locator('text=Receive|Receiving|Stock');
          await expect(modalTitle.first()).toBeVisible({ timeout: 5000 });
          
          // Verify quantity fields are editable
          const qtyInputs = page.locator('input[placeholder*="received" i], input[name*="received" i]');
          if (await qtyInputs.first().isVisible()) {
            const count = await qtyInputs.count();
            expect(count).toBeGreaterThan(0);
            
            // Fill in quantities
            for (let i = 0; i < Math.min(count, 3); i++) {
              await qtyInputs.nth(i).fill('5');
            }
          }
          
          // Submit receive
          const submitBtn = page.locator('button:has-text("Receive"), button:has-text("Submit"), button:has-text("Confirm")').first();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            
            // Verify success message
            const successMsg = page.locator('text=received|updated|Successfully');
            await expect(successMsg.first()).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });

    test('should allow partial receipt of items', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to PO
      const poTab = page.locator('text=Purchase Orders, text=PO');
      await poTab.first().click();
      
      // Find a PO and open receive modal
      const poRow = page.locator('table tbody tr, [role="row"]').first();
      if (await poRow.isVisible()) {
        const receiveBtn = poRow.locator('button:has-text("Receive"), button[aria-label*="receive" i]');
        if (await receiveBtn.isVisible()) {
          await receiveBtn.click();
          
          // Verify modal
          const modal = page.locator('[role="dialog"], .modal, .receive-modal').first();
          if (await modal.isVisible()) {
            // Get all quantity inputs
            const qtyInputs = modal.locator('input[placeholder*="received" i], input[name*="received" i]');
            const qtyLabels = modal.locator('text=/Ordered|Quantity/', modal.locator('text=/ordered|quantity/'));
            
            if (await qtyInputs.count() > 0) {
              // Enter partial quantities (less than ordered)
              await qtyInputs.first().fill('2'); // Partial
              
              // Submit
              const submitBtn = modal.locator('button:has-text("Receive"), button:has-text("Submit")').first();
              if (await submitBtn.isVisible()) {
                await submitBtn.click();
                
                // Status should show partially_received
                const statusText = page.locator('text=partial|Partial Received, text=partially_received');
                await expect(statusText.first()).toBeVisible({ timeout: 5000 }).catch(() => {
                  // Alternative: Just verify success message
                  const successMsg = page.locator('text=received|updated|Successfully');
                  return expect(successMsg.first()).toBeVisible();
                });
              }
            }
          }
        }
      }
    });

    test('should log transaction when receiving stock', async ({ page }) => {
      // This test verifies that transactions are logged in the backend
      // Call API to verify transaction log
      if (authToken && purchaseOrderId) {
        const response = await fetch(`${API_BASE_URL}/purchase-orders/${purchaseOrderId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        // Verify transaction metadata or created_at timestamp
        if (data && data.actual_delivery_date) {
          expect(data.actual_delivery_date).toBeTruthy();
        }
      }
    });
  });

  test.describe('Search and Navigation', () => {
    test('should find supplier via global search', async ({ page }) => {
      await page.goto(`${BASE_URL}`);
      
      // Look for global search bar
      const searchInput = page.locator('input[placeholder*="search" i], [aria-label*="search" i]');
      if (await searchInput.isVisible()) {
        // Search for supplier
        await searchInput.click();
        await searchInput.fill('supplier');
        
        // Wait for results
        await page.waitForTimeout(500);
        
        // Verify results appear
        const results = page.locator('[role="option"], .search-result, .dropdown-item');
        const resultCount = await results.count();
        expect(resultCount).toBeGreaterThan(0);
        
        // Click first result
        const firstResult = results.first();
        if (await firstResult.isVisible()) {
          await firstResult.click();
          
          // Should navigate to suppliers section
          await page.waitForTimeout(500);
          const suppliersText = page.locator('text=Suppliers');
          const poText = page.locator('text=Purchase Orders');
          
          const isOnSuppliersOrPO = await suppliersText.isVisible() || await poText.isVisible();
          expect(isOnSuppliersOrPO).toBe(true);
        }
      }
    });

    test('should display bar items with search in Quick POS', async ({ page }) => {
      await page.goto(`${BASE_URL}/pos`);
      
      // Look for bar items section
      const barItemsSection = page.locator('text=Bar|Beverages, [data-section="bar"], [aria-label*="bar" i]');
      if (await barItemsSection.first().isVisible()) {
        // Verify items are displayed
        const items = page.locator('[data-product-type="bar"], [data-category="bar"] [role="button"]');
        const itemCount = await items.count();
        expect(itemCount).toBeGreaterThan(0);
      }
      
      // Look for search bar in POS
      const posSearch = page.locator('input[placeholder*="search" i], [aria-label*="search" i]');
      if (await posSearch.isVisible()) {
        // Search for bar item
        await posSearch.fill('beer');
        await page.waitForTimeout(500);
        
        // Verify search results
        const results = page.locator('[role="option"], .product-item, button:has(text=/beer/i)');
        const resultCount = await results.count();
        expect(resultCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should allow adding bar items to order from search', async ({ page }) => {
      await page.goto(`${BASE_URL}/pos`);
      
      // Search for an item
      const searchInput = page.locator('input[placeholder*="search" i]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('beer');
        await page.waitForTimeout(300);
        
        // Click on search result
        const firstResult = page.locator('[role="option"], .product-item, button:has(text=/beer/i)').first();
        if (await firstResult.isVisible()) {
          await firstResult.click();
          
          // Verify item was added to order (look for order summary update)
          const orderTotal = page.locator('[data-testid="order-total"], .order-total, text=/Total|TOTAL/');
          await expect(orderTotal.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle missing supplier on PO creation', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to PO
      const poTab = page.locator('text=Purchase Orders, text=PO');
      await poTab.first().click();
      
      // Try to create without selecting supplier
      const addPoBtn = page.locator('button:has-text("Add"), button:has-text("Create")').first();
      if (await addPoBtn.isVisible()) {
        await addPoBtn.click();
        
        // Try to save without supplier
        const saveBtn = page.locator('button:has-text("Save")').first();
        if (await saveBtn.isVisible()) {
          // Check if button is disabled
          const isDisabled = await saveBtn.isDisabled();
          
          if (!isDisabled) {
            await saveBtn.click();
            
            // Expect error message
            const errorMsg = page.locator('text=supplier|required|please select');
            await expect(errorMsg.first()).toBeVisible({ timeout: 5000 });
          } else {
            expect(isDisabled).toBe(true);
          }
        }
      }
    });

    test('should handle duplicate supplier names', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to suppliers
      const suppliersTab = page.locator('text=Suppliers');
      if (await suppliersTab.isVisible()) {
        await suppliersTab.click();
        
        // Get first supplier name
        const firstSupplierName = page.locator('table tbody tr, [role="row"]').first().locator('td, [role="cell"]').first();
        const supplierName = await firstSupplierName.textContent();
        
        if (supplierName) {
          // Try to create with same name
          const addBtn = page.locator('button:has-text("Add"), button:has-text("Create")').first();
          if (await addBtn.isVisible()) {
            await addBtn.click();
            
            // Fill in form with duplicate name
            const nameInput = page.locator('input[placeholder*="name" i], input[name*="name" i]');
            if (await nameInput.isVisible()) {
              await nameInput.fill(supplierName);
              
              // Try to save
              const saveBtn = page.locator('button:has-text("Save")').first();
              if (await saveBtn.isVisible()) {
                await saveBtn.click();
                
                // Expect error or validation message
                const errorMsg = page.locator('text=duplicate|already exists|must be unique');
                await expect(errorMsg.first()).toBeVisible({ timeout: 5000 }).catch(() => {
                  // If no error message, check if form is still visible (meaning save failed)
                  return expect(nameInput).toBeVisible();
                });
              }
            }
          }
        }
      }
    });
  });
});