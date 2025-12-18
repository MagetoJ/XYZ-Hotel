import { Router } from 'express';
import * as maintenanceController from '../controllers/maintenanceController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All maintenance routes require authentication
router.use(authenticateToken);

// Get all maintenance requests (available to housekeeping, admin, manager)
router.get('/', 
  authorizeRoles('housekeeping', 'admin', 'manager'), 
  maintenanceController.getMaintenanceRequests
);

// Get specific maintenance request by ID
router.get('/:id', 
  authorizeRoles('housekeeping', 'admin', 'manager'), 
  maintenanceController.getMaintenanceRequestById
);

// Create new maintenance request
router.post('/', 
  authorizeRoles('housekeeping', 'admin', 'manager', 'receptionist'), 
  maintenanceController.createMaintenanceRequest
);

// Update maintenance request status
router.put('/:id', 
  authorizeRoles('housekeeping', 'admin', 'manager'), 
  maintenanceController.updateMaintenanceRequest
);

// Delete maintenance request (admin and manager only)
router.delete('/:id', 
  authorizeRoles('admin', 'manager'), 
  maintenanceController.deleteMaintenanceRequest
);

export default router;