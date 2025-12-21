import { Router } from 'express';
import * as monitoringController from '../controllers/monitoringController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.get('/health', authenticateToken, authorizeRoles('superadmin', 'admin'), monitoringController.getSystemHealth);

router.get('/metrics-history', authenticateToken, authorizeRoles('superadmin', 'admin'), monitoringController.getSystemMetricsHistory);

router.get('/database', authenticateToken, authorizeRoles('superadmin', 'admin'), monitoringController.getDatabaseMetrics);

router.get('/alerts', authenticateToken, authorizeRoles('superadmin', 'admin'), monitoringController.getPerformanceAlerts);

export default router;
