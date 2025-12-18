import { Request, Response } from 'express';
import db from '../db';
import fs from 'fs';
import * as XLSX from 'xlsx';
const pdf = require('pdf-parse');

// Get inventory items based on user role
export const getInventory = async (req: Request, res: Response) => {
  try {
    const {
      inventory_type,
      low_stock,
      search
    } = req.query;

    const userRole = req.user?.role;

    const [hasSupplierIdColumn, hasSupplierColumn, hasProductIdColumn] = await Promise.all([
      db.schema.hasColumn('inventory_items', 'supplier_id'),
      db.schema.hasColumn('inventory_items', 'supplier'),
      db.schema.hasColumn('inventory_items', 'product_id')
    ]);

    let query = db('inventory_items').where('is_active', true);

    if (hasSupplierIdColumn) {
      query = query.leftJoin('suppliers', 'inventory_items.supplier_id', 'suppliers.id');
    }

    if (hasProductIdColumn) {
      query = query.leftJoin('products', 'inventory_items.product_id', 'products.id');
    }

    const selectFields = ['inventory_items.*'];

    if (hasSupplierIdColumn) {
      selectFields.push('suppliers.name as supplier_name');
    } else if (hasSupplierColumn) {
      selectFields.push('inventory_items.supplier as supplier_name');
    }

    if (hasProductIdColumn) {
      selectFields.push('products.name as product_name');
    }

    query = query.select(selectFields).orderBy('inventory_items.name', 'asc');

    if (!userRole) {
      return res.status(403).json({ message: 'User role not found' });
    }

    // Apply role-based filtering
    if (userRole === 'kitchen_staff') {
      query.where('inventory_items.inventory_type', 'kitchen');
    } else if (userRole === 'receptionist') {
      query.whereIn('inventory_items.inventory_type', ['bar', 'housekeeping', 'minibar']);
    } else if (userRole === 'waiter' || userRole === 'quick_pos') {
      query.where('inventory_items.inventory_type', 'bar');
    } else if (!['admin', 'manager'].includes(userRole)) {
      return res.json([]);
    }

    if (inventory_type) {
      query = query.where('inventory_items.inventory_type', inventory_type as string);
    }

    if (low_stock === 'true') {
      query = query.whereRaw('inventory_items.current_stock <= inventory_items.minimum_stock');
    }

    if (search) {
      const searchTerm = search as string;
      query = query.where('inventory_items.name', 'ilike', `%${searchTerm}%`);
    }

    const inventory = await query;
    res.json(inventory);

  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ 
      message: 'Error fetching inventory', 
      error: (err as Error).message 
    });
  }
};

// Create new inventory item
export const createInventoryItem = async (req: Request, res: Response) => {
  try {
    const {
      name,
      unit,
      current_stock,
      minimum_stock,
      cost_per_unit,
      buying_price,
      supplier,
      inventory_type
    } = req.body;

    if (!name || !unit || !supplier) {
      return res.status(400).json({ 
        message: 'Name, unit, and supplier are required' 
      });
    }

    const userRole = req.user?.role;
    const allowedTypes = getAllowedInventoryTypes(userRole);
    
    if (!allowedTypes.includes(inventory_type)) {
      return res.status(403).json({ 
        message: 'You do not have permission to create this type of inventory item' 
      });
    }

    const [newItem] = await db('inventory_items')
      .insert({
        name,
        unit,
        current_stock: Number(current_stock) || 0,
        minimum_stock: Number(minimum_stock) || 0,
        cost_per_unit: Number(cost_per_unit) || 0,
        buying_price: Number(buying_price) || 0,
        supplier,
        inventory_type,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    res.status(201).json(newItem);

  } catch (err) {
    console.error('Error creating inventory item:', err);
    res.status(500).json({ 
      message: 'Error creating inventory item' 
    });
  }
};

// Update inventory item
export const updateInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updated_at: new Date() };

    const existingItem = await db('inventory_items').where({ id }).first();
    if (!existingItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const userRole = req.user?.role;
    const allowedTypes = getAllowedInventoryTypes(userRole);
    
    if (!allowedTypes.includes(existingItem.inventory_type)) {
      return res.status(403).json({ 
        message: 'You do not have permission to update this inventory item' 
      });
    }

    const [updatedItem] = await db('inventory_items')
      .where({ id })
      .update(updateData)
      .returning('*');

    res.json(updatedItem);

  } catch (err) {
    console.error('Error updating inventory item:', err);
    res.status(500).json({ 
      message: 'Error updating inventory item' 
    });
  }
};

// Update stock quantity only
export const updateStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { current_stock } = req.body;
    const userRole = req.user?.role;

    if (current_stock === undefined) {
      return res.status(400).json({ message: 'Current stock value is required' });
    }

    const inventoryItem = await db('inventory_items').where({ id }).first();
    
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const isAdminOrManager = ['admin', 'manager'].includes(userRole!);
    const isKitchenStaff = userRole === 'kitchen_staff' && inventoryItem.inventory_type === 'kitchen';
    const isReceptionist = userRole === 'receptionist' && 
      ['bar', 'housekeeping', 'minibar'].includes(inventoryItem.inventory_type);

    if (!isAdminOrManager && !isKitchenStaff && !isReceptionist) {
      return res.status(403).json({ 
        message: `You do not have permission to update ${inventoryItem.inventory_type} items.` 
      });
    }

    const [updatedItem] = await db('inventory_items')
      .where({ id })
      .update({ 
        current_stock: Math.max(0, current_stock), 
        updated_at: new Date() 
      })
      .returning('*');

    res.json(updatedItem);
  } catch (err) {
    console.error('Inventory stock update error:', err);
    res.status(500).json({ message: 'Error updating inventory stock' });
  }
};

// ROBUST: Upload and process inventory (Supports Excel, CSV & PDF with flexible parsing)
export const uploadInventory = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const errors: string[] = [];

  try {
    console.log('📦 Starting inventory upload, file:', req.file.originalname);
    let jsonData: any[] = [];

    if (req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf')) {
      console.log('📄 Processing PDF file...');
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdf(dataBuffer);
      const text = pdfData.text;
      
      const lines = text.split(/\r\n|\n/);
      
      jsonData = lines.map((line: string) => {
        if (!line.trim() || line.toLowerCase().includes('item name') || line.toLowerCase().includes('page')) return null;

        const parts = line.trim().split(/[\t\s]{2,}|,|\t/);
        
        if (parts.length >= 2) {
           const possibleCost = parseFloat(parts[parts.length - 1].replace(/,/g, ''));
           const possibleQty = parseFloat(parts[parts.length - 2].replace(/,/g, ''));
           
           const cost = isNaN(possibleCost) ? 0 : possibleCost;
           const qty = isNaN(possibleQty) ? 0 : possibleQty;
           
           const nameParts = parts.slice(0, parts.length - 2);
           const name = nameParts.join(' ').trim();

           if (name) {
             return {
               'Item Name': name,
               'Current Stock': qty,
               'Cost per Unit (KES)': cost
             };
           }
        }
        return null;
      }).filter((item: any) => item !== null);
      
      console.log(`📄 Extracted ${jsonData.length} items from PDF`);
    } else {
      console.log('📊 Processing Spreadsheet (Excel/CSV)...');
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      jsonData = XLSX.utils.sheet_to_json(worksheet);
    }

    console.log('📊 Parsed rows:', jsonData.length);
    if (jsonData.length === 0) {
      throw new Error("File appears to be empty.");
    }

    const existingItemsRaw = await db('inventory_items').select('id', 'name', 'current_stock', 'cost_per_unit', 'inventory_type');
    const existingItemsMap = new Map();
    existingItemsRaw.forEach(item => {
      existingItemsMap.set(item.name.toLowerCase().trim(), item);
    });

    const itemsToInsert: any[] = [];
    const itemsToUpdate: any[] = [];

    // Smart value finder - looks for columns with flexible naming
    const findValue = (row: any, ...possibleHeaders: string[]): string | undefined => {
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

    // Robust number parser - handles "4,000", "-", spaces, etc
    const parseNumber = (value: any): number => {
      if (!value) return 0;
      const str = String(value)
        .trim()
        .replace(/,/g, '')         // Remove commas
        .replace(/"/g, '')         // Remove quotes
        .replace(/\s+/g, '')       // Remove spaces
        .replace(/-/g, '0');       // Replace dash with 0
      const num = parseFloat(str);
      return isNaN(num) ? 0 : Math.max(0, num);
    };

    let rowCount = 0;
    for (const row of jsonData) {
      rowCount++;
      
      try {
        // Skip empty rows
        if (!Object.keys(row).some(k => row[k])) continue;

        const name = findValue(row, 'Item Name', 'Name', 'Product', 'Item');
        if (!name) {
          errors.push(`Row ${rowCount}: No item name found`);
          continue;
        }

        const rawQty = findValue(row, 'Current Stock', 'Stock', 'Quantity', 'Qty');
        const quantity = parseNumber(rawQty);

        const rawSelling = findValue(row, 'Selling Price', 'Cost per Unit (KES)', 'Cost Per Unit (KES)', 'Cost', 'Price', 'SRP');
        const sellingPrice = parseNumber(rawSelling);

        const rawBuying = findValue(row, 'Buying Price', 'Cost', 'Purchase Price', 'Buying Cost', 'Unit Cost');
        const buyingPrice = parseNumber(rawBuying);

        // Use smart defaults for missing fields
        const unit = findValue(row, 'Unit', 'Measurement') || 'unit';
        const supplier = findValue(row, 'Supplier', 'Vendor', 'supplier_name') || 'Unknown';
        const typeRaw = findValue(row, 'Type', 'Category', 'inventory_type');
        const typeNormalized = typeRaw ? typeRaw.toLowerCase().trim() : 'bar';
        const validTypes = ['kitchen', 'bar', 'housekeeping', 'minibar'];
        const type = validTypes.includes(typeNormalized) ? typeNormalized : 'bar';

        const normalizedName = name.toLowerCase().trim();
        const existingItem = existingItemsMap.get(normalizedName);

        if (existingItem) {
          itemsToUpdate.push({
            id: existingItem.id,
            current_stock: quantity,
            cost_per_unit: sellingPrice > 0 ? sellingPrice : existingItem.cost_per_unit,
            buying_price: buyingPrice > 0 ? buyingPrice : existingItem.buying_price,
            is_active: true,
            updated_at: new Date()
          });
        } else {
          itemsToInsert.push({
            name,
            unit,
            current_stock: quantity,
            minimum_stock: 0,
            cost_per_unit: sellingPrice,
            buying_price: buyingPrice,
            supplier,
            inventory_type: type,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      } catch (rowErr) {
        errors.push(`Row ${rowCount}: ${(rowErr as Error).message}`);
        continue;
      }
    }

    if (itemsToInsert.length === 0 && itemsToUpdate.length === 0) {
      throw new Error(`No valid items found in file. Please ensure the file has columns: Item Name, Stock, Unit, Supplier, Cost, Type`);
    }

    console.log('📥 Items to insert:', itemsToInsert.length);
    console.log('📤 Items to update:', itemsToUpdate.length);
    console.log('🔍 Sample insert item:', itemsToInsert[0]);

    await db.transaction(async (trx) => {
      if (itemsToInsert.length > 0) {
        const insertResult = await trx('inventory_items').insert(itemsToInsert);
        console.log('✅ Inserted items result:', insertResult);
      }

      if (itemsToUpdate.length > 0) {
        for (const item of itemsToUpdate) {
          const updateResult = await trx('inventory_items')
            .where({ id: item.id })
            .update({
              current_stock: item.current_stock,
              cost_per_unit: item.cost_per_unit,
              buying_price: item.buying_price,
              is_active: true,
              updated_at: item.updated_at
            });
          console.log(`✅ Updated item ${item.id}:`, updateResult);
        }
      }
    });

    const verifyCount = await db('inventory_items').count('* as count').first();
    console.log('🔢 Total items in DB after upload:', verifyCount);

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({
      message: 'Inventory imported successfully (Stock Replaced)',
      processed_count: itemsToInsert.length + itemsToUpdate.length,
      inserted: itemsToInsert.length,
      updated: itemsToUpdate.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error('File processing error:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Error processing file', error: (err as Error).message });
  }
};

// Delete inventory item (SOFT DELETE)
export const deleteInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingItem = await db('inventory_items').where({ id }).first();
    if (!existingItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const userRole = req.user?.role;
    const allowedTypes = getAllowedInventoryTypes(userRole);
    
    if (!allowedTypes.includes(existingItem.inventory_type)) {
      return res.status(403).json({ 
        message: 'You do not have permission to delete this inventory item' 
      });
    }

    await db('inventory_items')
      .where({ id })
      .update({
        is_active: false,
        updated_at: new Date()
      });
      
    res.json({ message: 'Inventory item deleted successfully' });

  } catch (err) {
    console.error('Error deleting inventory item:', err);
    res.status(500).json({ 
      message: 'Error deleting inventory item',
      error: (err as Error).message
    });
  }
};

// Helper function to get allowed inventory types based on user role
function getAllowedInventoryTypes(role?: string): string[] {
  switch (role) {
    case 'kitchen':
    case 'kitchen_staff':
      return ['kitchen'];
    case 'receptionist':
      return ['housekeeping', 'minibar'];
    case 'housekeeping':
      return ['housekeeping', 'minibar'];
    case 'quick_pos':
    case 'waiter':
      return ['bar'];
    case 'admin':
    case 'manager':
      return ['kitchen', 'bar', 'housekeeping', 'minibar'];
    default:
      return [];
  }
}
