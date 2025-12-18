import { Router } from 'express';
import * as recipesController from '../controllers/recipesController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All recipe routes require authentication
router.use(authenticateToken);

// Get all recipes
router.get('/', recipesController.getRecipes);

// Get recipe by ID with ingredients
router.get('/:id', recipesController.getRecipeById);

// Get recipe for a specific product
router.get('/product/:productId', recipesController.getProductRecipe);

// Only admin and manager can create/update/delete recipes
router.post('/', authorizeRoles('admin', 'manager'), recipesController.createRecipe);

// Update recipe
router.put('/:id', authorizeRoles('admin', 'manager'), recipesController.updateRecipe);

// Deactivate recipe
router.patch('/:id/deactivate', authorizeRoles('admin', 'manager'), recipesController.deactivateRecipe);

export default router;