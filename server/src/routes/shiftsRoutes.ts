import { Router } from 'express';
import * as shiftsController from '../controllers/shiftsController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All shifts routes require authentication
router.use(authenticateToken);

// Get user's own shifts (all authenticated users)
router.get('/my-shifts', shiftsController.getMyShifts);

// Admin/Manager only routes
router.get('/', 
  authorizeRoles('admin', 'manager'), 
  shiftsController.getAllShifts
);

router.post('/', 
  authorizeRoles('admin', 'manager'), 
  shiftsController.createShift
);

router.put('/:id', 
  authorizeRoles('admin', 'manager'), 
  shiftsController.updateShift
);

router.delete('/:id', 
  authorizeRoles('admin', 'manager'), 
  shiftsController.deleteShift
);

export default router;