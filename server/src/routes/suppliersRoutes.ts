import { Router } from 'express';
import * as suppliersController from '../controllers/suppliersController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All supplier routes require authentication
router.use(authenticateToken);

// Only admin and manager can access supplier routes
router.use(authorizeRoles('admin', 'manager'));

// Get all suppliers
router.get('/', suppliersController.getSuppliers);

// Get supplier by ID
router.get('/:id', suppliersController.getSupplierById);

// Get supplier's purchase orders
router.get('/:id/purchase-orders', suppliersController.getSupplierPurchaseOrders);

// Create supplier
router.post('/', suppliersController.createSupplier);

// Update supplier
router.put('/:id', suppliersController.updateSupplier);

// Deactivate supplier
router.patch('/:id/deactivate', suppliersController.deactivateSupplier);

export default router;