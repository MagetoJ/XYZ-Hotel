// server/src/routes/reportsRoutes.ts
import express from 'express';
// --- MODIFICATION: Import authorizeRoles ---
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import * as reportsController from '../controllers/reportsController';

const router = express.Router();

// --- ADD NEW ADMIN-ONLY ROUTE HERE ---
// This route is checked first and is restricted to admins.
router.get(
  '/receipts',
  authenticateToken,
  authorizeRoles('admin'), // Ensures only admins can access
  reportsController.getReceiptsByDate // The new controller function
);


// All routes below this line require authentication for *any* role
router.use(authenticateToken);

// Personal sales report
router.get('/personal-sales', reportsController.getPersonalSales);

// Waiter sales report
router.get('/waiter-sales', reportsController.getWaiterSales);

// Overview report
router.get('/overview', reportsController.getOverviewReport);

// Sales report
router.get('/sales', reportsController.getSalesReport);

// Inventory report
router.get('/inventory', reportsController.getInventoryReport);

// Staff report
router.get('/staff', reportsController.getStaffReport);

// Rooms report
router.get('/rooms', reportsController.getRoomsReport);

// Performance report
router.get('/performance', reportsController.getPerformanceReport);

// Annual report
router.get('/annual', reportsController.getAnnualReport);

export default router;