import { Request, Response } from 'express';
import db from '../db';
import fs from 'fs';
import * as XLSX from 'xlsx';

export const getPublicProducts = async (req: Request, res: Response) => {
  try {
    const products = await db('products')
      .leftJoin('categories', 'products.category_id', 'categories.id') // Join to get category name
      .select(
        'products.id',
        'products.name',
        'products.description',
        'products.price',
        'products.image_url',
        'products.category_id',
        'categories.name as category_name' // Select category name
      )
      .where('products.is_active', true) // Only active products
      .where('products.is_available', true) // Only available products
      .orderBy('categories.display_order', 'asc') // Order by category display order
      .orderBy('products.name', 'asc'); // Then by product name

    // Group products by category for easier use on the frontend
    const groupedProducts = products.reduce((acc, product) => {
      const categoryName = product.category_name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        image_url: product.image_url,
      });
      return acc;
    }, {} as Record<string, any[]>);


    res.json(groupedProducts); // Return the grouped structure
  } catch (err) {
    console.error('Error fetching public products:', err);
    res.status(500).json({ message: 'Error fetching public products' });
  }
};
// Get all products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const { category_id } = req.query;
    
    let query = db('products')
      .select('*')
      .where('is_active', true)
      .orderBy('name', 'asc');

    if (category_id && category_id !== 'all') {
      query = query.where('category_id', category_id);
    }

    const products = await query;
    res.json(products);

  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: 'Error fetching products' });
  }
};

// Get product by ID
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await db('products')
      .where({ id, is_active: true })
      .first();

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);

  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ message: 'Error fetching product' });
  }
};

// Create new product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      category_id, // <-- FIX
      price,
      cost, // <-- ADD THIS
      description,
      preparation_time, // <-- ADD THIS
      image_url, // <-- FIX (matches frontend)
      is_available
    } = req.body;

    // Validation
    if (!name || !category_id || price === undefined) {
      return res.status(400).json({ 
        message: 'Name, category_id, and price are required' 
      });
    }

    // Check if product name already exists in the same category_id
    const existingProduct = await db('products')
      .where({ name, category_id, is_active: true })
      .first();

    if (existingProduct) {
      return res.status(400).json({ 
        message: 'Product with this name already exists in this category_id' 
      });
    }

  const [newProduct] = await db('products')
      .insert({
        name,
        category_id, // <-- FIX
        price,
        cost: cost || 0, // <-- ADD THIS
        description: description || '',
        preparation_time: preparation_time || 0, // <-- ADD THIS
        image_url: image_url || null, // <-- FIX
        // 'ingredients' is not in your frontend or DB schema, so it's removed.
        is_available: is_available !== undefined ? is_available : true,
        is_active: true,
        // created_at and updated_at are usually handled by the database
      })
      .returning('*');

    res.status(201).json(newProduct);

  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ message: 'Error creating product' });
  }
};

// Update product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category_id, price, description, is_available, cost, preparation_time, image_url } = req.body;

    // Check if product exists
    const existingProduct = await db('products').where({ id }).first();
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Build update data with only safe fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (price !== undefined) updateData.price = price;
    if (description !== undefined) updateData.description = description;
    if (is_available !== undefined) updateData.is_available = is_available;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (cost !== undefined) updateData.cost = cost;
    if (preparation_time !== undefined) updateData.preparation_time = preparation_time;

    // If updating name/category_id, check for duplicates
    if (updateData.name || updateData.category_id) {
      const checkName = updateData.name || existingProduct.name;
      const checkCategoryId = updateData.category_id || existingProduct.category_id;
      
      const duplicateProduct = await db('products')
        .where({ name: checkName, category_id: checkCategoryId, is_active: true })
        .whereNot({ id })
        .first();

      if (duplicateProduct) {
        return res.status(400).json({ 
          message: 'Product with this name already exists in this category_id' 
        });
      }
    }

    const [updatedProduct] = await db('products')
      .where({ id })
      .update(updateData)
      .returning('*');

    res.json(updatedProduct);

  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Error updating product' });
  }
};

// Delete product (soft delete)
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const existingProduct = await db('products').where({ id }).first();
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Soft delete by setting is_active to false
    await db('products')
      .where({ id })
      .update({ 
        is_active: false,
        updated_at: new Date() 
      });

    res.json({ message: 'Product deleted successfully' });

  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ message: 'Error deleting product' });
  }
};

// Get product categories
export const getProductCategories = async (req: Request, res: Response) => {
  try {
    const categories = await db('products')
      .distinct('category_id')
      .where('is_active', true)
      .orderBy('category_id', 'asc');

    const category_idList = categories.map(cat => cat.category_id).filter(Boolean);
    
    res.json(category_idList);

  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

// Toggle product availability
export const toggleProductAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await db('products').where({ id }).first();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const [updatedProduct] = await db('products')
      .where({ id })
      .update({ 
        is_available: !product.is_available,
        updated_at: new Date() 
      })
      .returning('*');

    res.json(updatedProduct);

  } catch (err) {
    console.error('Error toggling product availability:', err);
    res.status(500).json({ message: 'Error toggling product availability' });
  }
};

export const exportProducts = async (req: Request, res: Response) => {
  try {
    const products = await db('products')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .select(
        'products.name as Name',
        'categories.name as Category',
        'products.price as Price',
        'products.cost as Cost',
        'products.description as Description',
        'products.preparation_time as PrepTime',
        'products.is_active as Active',
        'products.is_available as Available'
      )
      .orderBy('categories.name', 'asc')
      .orderBy('products.name', 'asc');

    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found to export' });
    }

    const worksheet = XLSX.utils.json_to_sheet(products);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (err) {
    console.error('Export Error:', err);
    res.status(500).json({ 
      message: 'Failed to generate export file', 
      error: (err as Error).message 
    });
  }
}; 
  
export const uploadProducts = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const errors: string[] = [];

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      throw new Error('The uploaded file is empty or has no readable data.');
    }

    const categories = await db('categories').select('id', 'name');
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase().trim(), c.id]));

    const existingProducts = await db('products').select('id', 'name');
    const existingProductMap = new Map(existingProducts.map(p => [p.name.toLowerCase().trim(), p.id]));

    const itemsToInsert: any[] = [];
    const itemsToUpdate: any[] = [];

    for (const row of jsonData) {
      const getVal = (key: string) => {
        const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
        return foundKey ? row[foundKey] : undefined;
      };

      const name = getVal('Name') || getVal('Product Name') || getVal('Item Name');
      const categoryName = getVal('Category');
      const price = parseFloat(getVal('Price') || '0');
      const cost = parseFloat(getVal('Cost') || '0');
      
      if (!name) continue;

      let categoryId = 1;
      if (categoryName && categoryMap.has(categoryName.toLowerCase().trim())) {
        categoryId = categoryMap.get(categoryName.toLowerCase().trim())!;
      }

      const normalizedName = name.toLowerCase().trim();
      const existingId = existingProductMap.get(normalizedName);

      if (existingId) {
        itemsToUpdate.push({
          id: existingId,
          price: price || undefined,
          cost: cost || undefined,
          category_id: categoryId,
          updated_at: new Date()
        });
      } else {
        itemsToInsert.push({
          name,
          category_id: categoryId,
          price: price,
          cost: cost,
          description: getVal('Description') || '',
          preparation_time: parseInt(getVal('PrepTime') || '0'),
          is_active: true,
          is_available: true
        });
      }
    }

    if (itemsToInsert.length === 0 && itemsToUpdate.length === 0) {
      throw new Error('No valid products found. Check your column headers (Name, Price, Category).');
    }

    await db.transaction(async (trx) => {
      if (itemsToInsert.length > 0) await trx('products').insert(itemsToInsert);
      
      for (const item of itemsToUpdate) {
        const { id, ...rest } = item;
        const updatePayload = Object.fromEntries(Object.entries(rest).filter(([_, v]) => v !== undefined));
        if (Object.keys(updatePayload).length > 0) {
          await trx('products').where({ id }).update(updatePayload);
        }
      }
    });

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({
      message: 'Products imported successfully',
      processed: itemsToInsert.length + itemsToUpdate.length
    });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Import failed', error: (err as Error).message });
  }
}; 
