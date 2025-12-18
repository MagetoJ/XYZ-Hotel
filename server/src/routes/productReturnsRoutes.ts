import { Router } from 'express';
import * as productReturnsController from '../controllers/productReturnsController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All product return routes require authentication
router.use(authenticateToken);

// Get returns summary - MUST be before /:id route
router.get('/summary', 
  authorizeRoles('admin', 'manager'),
  productReturnsController.getReturnsSummary
);

// Get inventory items for returns dropdown
router.get('/data/inventory', 
  authorizeRoles('admin', 'manager', 'cashier'),
  productReturnsController.getInventoryForReturns
);

// Get products for returns dropdown (legacy)
router.get('/data/products', 
  authorizeRoles('admin', 'manager', 'cashier'),
  productReturnsController.getProductsForReturns
);

// Get all product returns - available to staff, managers, admin
router.get('/', 
  authorizeRoles('admin', 'manager', 'cashier', 'waiter'),
  productReturnsController.getProductReturns
);

// Get product return by ID
router.get('/:id', 
  authorizeRoles('admin', 'manager', 'cashier', 'waiter'),
  productReturnsController.getProductReturnById
);

// Create new product return - admin and manager only
router.post('/', 
  authorizeRoles('admin', 'manager'),
  productReturnsController.createProductReturn
);

// Update product return - admin and manager only
router.put('/:id', 
  authorizeRoles('admin', 'manager'),
  productReturnsController.updateProductReturn
);

// Delete product return - admin and manager only
router.delete('/:id', 
  authorizeRoles('admin', 'manager'),
  productReturnsController.deleteProductReturn
);

export default router;