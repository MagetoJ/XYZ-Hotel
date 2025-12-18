import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import * as performanceController from '../controllers/performanceController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Specific routes must be defined BEFORE parametric routes
// Admin/Manager can view all staff performance
router.get('/all', 
  authorizeRoles('admin', 'manager'), 
  performanceController.getAllStaffPerformance
);

// Receptionist can view waiter performance
router.get('/waiters', 
  authorizeRoles('receptionist', 'admin', 'manager'), 
  performanceController.getWaiterPerformance
);

// Staff can view their own performance (must be AFTER specific routes)
router.get('/staff/:id', performanceController.getStaffPerformance);

export default router;