import { Router } from 'express';
import * as purchaseOrdersController from '../controllers/purchaseOrdersController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All purchase order routes require authentication
router.use(authenticateToken);

// Only admin and manager can access purchase order routes
router.use(authorizeRoles('admin', 'manager'));

// Get all purchase orders with optional filtering
router.get('/', purchaseOrdersController.getPurchaseOrders);

// Get purchase order by ID with items
router.get('/:id', purchaseOrdersController.getPurchaseOrderById);

// Create purchase order
router.post('/', purchaseOrdersController.createPurchaseOrder);

// Receive purchase order items
router.post('/:id/receive', purchaseOrdersController.receivePurchaseOrder);

// Cancel purchase order
router.patch('/:id/cancel', purchaseOrdersController.cancelPurchaseOrder);

export default router;