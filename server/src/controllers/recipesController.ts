import { Request, Response } from 'express';
import db from '../db';

// Get all recipes
export const getRecipes = async (req: Request, res: Response) => {
  try {
    const recipes = await db('recipes')
      .join('products', 'recipes.product_id', 'products.id')
      .select('recipes.*', 'products.name as product_name', 'products.price as product_price')
      .where('recipes.is_active', true)
      .orderBy('recipes.name');

    res.json(recipes);
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get recipe by ID with ingredients
export const getRecipeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recipe = await db('recipes')
      .where('recipes.id', id)
      .join('products', 'recipes.product_id', 'products.id')
      .select('recipes.*', 'products.name as product_name', 'products.price as product_price')
      .first();

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    const ingredients = await db('recipe_ingredients')
      .where('recipe_id', id)
      .join('inventory_items', 'recipe_ingredients.inventory_item_id', 'inventory_items.id')
      .select(
        'recipe_ingredients.*',
        'inventory_items.name as item_name',
        'inventory_items.current_stock',
        'inventory_items.unit'
      );

    res.json({ ...recipe, ingredients });
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create recipe
export const createRecipe = async (req: Request, res: Response) => {
  try {
    const { product_id, name, description, yield_quantity, yield_unit, ingredients } = req.body;
    const userId = (req as any).user?.id;

    if (!product_id || !name || !ingredients || ingredients.length === 0) {
      return res.status(400).json({
        message: 'Product, name, and at least one ingredient are required',
      });
    }

    // Check if recipe already exists for this product
    const existing = await db('recipes').where('product_id', product_id).first();
    if (existing) {
      return res.status(400).json({ message: 'Recipe already exists for this product' });
    }

    const [recipeId] = await db('recipes').insert({
      product_id,
      name,
      description: description || null,
      yield_quantity: yield_quantity || 1,
      yield_unit: yield_unit || 'unit',
      created_by: userId,
    });

    // Add ingredients
    for (const ingredient of ingredients) {
      await db('recipe_ingredients').insert({
        recipe_id: recipeId,
        inventory_item_id: ingredient.inventory_item_id,
        quantity_required: ingredient.quantity_required,
        unit: ingredient.unit,
      });
    }

    res.status(201).json({
      id: recipeId,
      message: 'Recipe created successfully',
    });
  } catch (error) {
    console.error('Create recipe error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update recipe
export const updateRecipe = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, yield_quantity, yield_unit, ingredients } = req.body;

    const recipe = await db('recipes').where('id', id).first();
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    await db('recipes').where('id', id).update({
      name,
      description: description || null,
      yield_quantity: yield_quantity || 1,
      yield_unit: yield_unit || 'unit',
      updated_at: new Date(),
    });

    if (ingredients) {
      // Delete existing ingredients
      await db('recipe_ingredients').where('recipe_id', id).del();

      // Add new ingredients
      for (const ingredient of ingredients) {
        await db('recipe_ingredients').insert({
          recipe_id: id,
          inventory_item_id: ingredient.inventory_item_id,
          quantity_required: ingredient.quantity_required,
          unit: ingredient.unit,
        });
      }
    }

    res.json({ message: 'Recipe updated successfully' });
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Deactivate recipe
export const deactivateRecipe = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const recipe = await db('recipes').where('id', id).first();
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    await db('recipes').where('id', id).update({
      is_active: false,
      updated_at: new Date(),
    });

    res.json({ message: 'Recipe deactivated successfully' });
  } catch (error) {
    console.error('Deactivate recipe error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get recipes for a product
export const getProductRecipe = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const recipe = await db('recipes')
      .where('product_id', productId)
      .first();

    if (!recipe) {
      return res.status(404).json({ message: 'No recipe found for this product' });
    }

    const ingredients = await db('recipe_ingredients')
      .where('recipe_id', recipe.id)
      .join('inventory_items', 'recipe_ingredients.inventory_item_id', 'inventory_items.id')
      .select(
        'recipe_ingredients.*',
        'inventory_items.name as item_name',
        'inventory_items.current_stock',
        'inventory_items.unit'
      );

    res.json({ ...recipe, ingredients });
  } catch (error) {
    console.error('Get product recipe error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};