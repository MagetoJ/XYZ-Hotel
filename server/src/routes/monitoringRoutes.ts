import { Router } from 'express';
import * as monitoringController from '../controllers/monitoringController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.get('/health', authenticateToken, authorizeRoles('superadmin', 'admin'), monitoringController.getSystemHealth);

router.get('/metrics-history', authenticateToken, authorizeRoles('superadmin', 'admin'), monitoringController.getSystemMetricsHistory);

router.get('/database', authenticateToken, authorizeRoles('superadmin', 'admin'), monitoringController.getDatabaseMetrics);

router.get('/alerts', authenticateToken, authorizeRoles('superadmin', 'admin'), monitoringController.getPerformanceAlerts);

router.get('/advanced-metrics', authenticateToken, authorizeRoles('superadmin', 'admin'), monitoringController.getAdvancedMetrics);

router.get('/staff-sales', authenticateToken, authorizeRoles('superadmin', 'admin', 'manager'), monitoringController.getStaffSalesDistribution);

router.get('/profitability', authenticateToken, authorizeRoles('superadmin', 'admin', 'manager'), monitoringController.getProfitabilityAnalytics);

router.get('/inventory-velocity', authenticateToken, authorizeRoles('superadmin', 'admin', 'manager'), monitoringController.getInventoryVelocity);

export default router;
