import express from 'express';
import { authenticateToken } from '../middleware/auth';
import * as categoriesController from '../controllers/categoriesController';

const router = express.Router();

// Get all categories (public for menu display)
router.get('/', categoriesController.getAllCategories);

// All other routes require authentication
router.use(authenticateToken);

// Create a new category
router.post('/', categoriesController.createCategory);

// Update a category
router.put('/:id', categoriesController.updateCategory);

// Delete a category
router.delete('/:id', categoriesController.deleteCategory);

// Update category status
router.patch('/:id/status', categoriesController.updateCategoryStatus);

export default router;