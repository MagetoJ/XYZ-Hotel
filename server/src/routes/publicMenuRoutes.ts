import { Router } from 'express';
import * as productController from '../controllers/productController';
import * as categoriesController from '../controllers/categoriesController';

const router = Router();

// Public routes - NO AUTHENTICATION NEEDED
router.get('/categories', categoriesController.getPublicCategories);
router.get('/products', productController.getPublicProducts);

export default router;