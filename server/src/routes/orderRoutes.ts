import { Router } from 'express';
import * as orderController from '../controllers/orderController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// Public routes (for POS system without full authentication)
router.post('/', orderController.createOrder);
router.post('/unified', orderController.createUnifiedOrder);
router.post('/validate-pin', orderController.validatePin);

// Protected routes require full authentication
router.use(authenticateToken);

// Get staff member's recent orders (for My Recent Orders feature)
router.get('/staff/recent', orderController.getStaffRecentOrders);

// Get ALL recent orders (for Receptionist/Admin view)
router.get('/recent/all', orderController.getAllRecentOrders);

// Get orders with filtering (all authenticated users can view orders)
router.get('/', orderController.getOrders);

// Get specific order by ID
router.get('/:id', orderController.getOrderById);

// Update order status (kitchen staff, admin, manager)
router.put('/:id/status', 
  authorizeRoles('kitchen_staff', 'admin', 'manager'),
  orderController.updateOrderStatus
);

// Mark order as completed when receipt is printed (for receipt auditing)
router.put('/:id/complete-for-print',
  authorizeRoles('admin', 'manager', 'receptionist', 'waiter', 'cashier'),
  orderController.markOrderAsCompleted
);

export default router;