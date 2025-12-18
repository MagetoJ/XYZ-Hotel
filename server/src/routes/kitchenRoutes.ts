import { Router } from 'express';
import * as kitchenController from '../controllers/kitchenController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All kitchen routes require authentication and specific roles
router.use(authenticateToken);
router.use(authorizeRoles('kitchen_staff', 'admin', 'manager'));

// Get active kitchen orders
router.get('/orders', kitchenController.getKitchenOrders);

// Update order status
router.put('/orders/:id/status', kitchenController.updateOrderStatus);

// Get kitchen dashboard statistics
router.get('/stats', kitchenController.getKitchenStats);

export default router;