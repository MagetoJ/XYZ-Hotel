import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin/manager privileges
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'manager'));

// Get active users
router.get('/active-users', adminController.getActiveUsers);

// Get user sessions (both active and recent inactive)
router.get('/user-sessions', adminController.getUserSessions);

// Get low stock alerts
router.get('/low-stock-alerts', adminController.getLowStockAlerts);

// Get user session history
router.get('/session-history', adminController.getUserSessionHistory);

export default router;