import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All dashboard routes require authentication and admin/manager privileges
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'manager'));

// Overview statistics
router.get('/overview-stats', dashboardController.getOverviewStats);

// Sales analytics
router.get('/sales-analytics', dashboardController.getSalesAnalytics);

// Inventory analytics
router.get('/inventory-analytics', dashboardController.getInventoryAnalytics);

// Staff performance analytics
router.get('/staff-performance', dashboardController.getStaffPerformance);

export default router;