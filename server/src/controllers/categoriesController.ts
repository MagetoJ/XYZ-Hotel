import { Request, Response } from 'express';
import db from '../db';

export const getPublicCategories = async (req: Request, res: Response) => {
  try {
    const categories = await db('categories')
      .select('id', 'name', 'description', 'display_order') // Select only needed fields
      .where('is_active', true) // Only show active categories
      .orderBy('display_order', 'asc');
    res.json(categories);
  } catch (error) {
    console.error('Get public categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
// Get all categories
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await db('categories')
      .select('*')
      .orderBy('name', 'asc');

    // If no categories exist, try to create default categories from products table
    if (categories.length === 0) {
      try {
        // Query categories from products table via category_id
        const productCategories = await db('products')
          .whereNotNull('category_id')
          .distinct('category_id')
          .join('categories', 'products.category_id', '=', 'categories.id')
          .select('categories.id', 'categories.name', 'categories.description')
          .orderBy('categories.name', 'asc');

        if (productCategories.length > 0) {
          return res.json(productCategories);
        }
      } catch (error) {
        // Silently fail if there's an error, will return empty array
        console.debug('Could not fetch categories from products:', error);
      }
    }

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create a new category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, is_active = true, display_order } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check if category already exists (case-insensitive)
    const existingCategory = await db('categories')
      .whereRaw('LOWER(name) = LOWER(?)', [name])
      .first();

    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    // Ensure categories table exists
    const hasTable = await db.schema.hasTable('categories');
    if (!hasTable) {
      await db.schema.createTable('categories', table => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.boolean('is_active').defaultTo(true);
        table.integer('display_order').defaultTo(0);
        table.timestamps(true, true);
        table.unique('name');
      });
    }

    // Get next display order if not provided
    let finalDisplayOrder = display_order;
    if (finalDisplayOrder === undefined || finalDisplayOrder === null) {
      const maxOrder = await db('categories')
        .max('display_order as max_order')
        .first();
      finalDisplayOrder = (maxOrder?.max_order || 0) + 1;
    }

    const [insertedCategory] = await db('categories')
      .insert({
        name,
        description,
        is_active,
        display_order: finalDisplayOrder
      })
      .returning('*');

    console.log('Category created successfully:', insertedCategory);
    res.status(201).json(insertedCategory);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update a category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check if category exists
    const existingCategory = await db('categories')
      .where('id', id)
      .first();

    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check for duplicate name (excluding current category)
    const duplicateCategory = await db('categories')
      .where('name', name)
      .where('id', '!=', id)
      .first();

    if (duplicateCategory) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    await db('categories')
      .where('id', id)
      .update({
        name,
        description,
        is_active
      });

    const updatedCategory = await db('categories')
      .where('id', id)
      .first();

    res.json(updatedCategory);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existingCategory = await db('categories')
      .where('id', id)
      .first();

    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const reassignedProducts = await db.transaction(async trx => {
      const updatedProducts = await trx('products')
        .where('category_id', id)
        .update({
          category_id: null,
          updated_at: trx.fn.now()
        })
        .returning('id');

      await trx('categories')
        .where('id', id)
        .del();

      return updatedProducts;
    });

    res.json({ 
      message: 'Category deleted successfully',
      reassignedProductCount: reassignedProducts.length
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update category status
export const updateCategoryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ message: 'is_active must be a boolean value' });
    }

    // Check if category exists
    const existingCategory = await db('categories')
      .where('id', id)
      .first();

    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await db('categories')
      .where('id', id)
      .update({
        is_active
      });

    const updatedCategory = await db('categories')
      .where('id', id)
      .first();

    res.json(updatedCategory);
  } catch (error) {
    console.error('Update category status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};