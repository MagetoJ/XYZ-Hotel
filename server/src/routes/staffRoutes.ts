import { Router } from 'express';
import * as staffController from '../controllers/staffController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// Public route for waiters (used in order creation)
router.get('/waiters', staffController.getWaiters);

// Protected routes require authentication
router.use(authenticateToken);

// Get all staff (admin and manager only)
router.get('/', 
  authorizeRoles('admin', 'manager'), 
  staffController.getStaff
);

// Get staff by ID (admin and manager only)
router.get('/:id', 
  authorizeRoles('admin', 'manager'), 
  staffController.getStaffById
);

// Create new staff member (admin and manager only)
router.post('/', 
  authorizeRoles('admin', 'manager'), 
  staffController.createStaff
);

// Update staff member (admin and manager only)
router.put('/:id', 
  authorizeRoles('admin', 'manager'), 
  staffController.updateStaff
);

// Delete staff member (admin and manager only)
router.delete('/:id', 
  authorizeRoles('admin', 'manager'), 
  staffController.deleteStaff
);

export default router;