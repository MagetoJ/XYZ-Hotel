import { Router } from 'express';
import * as tablesController from '../controllers/tablesController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// Get all tables (public - needed for POS order taking)
router.get('/', tablesController.getTables);

// All other table routes require authentication
router.use(authenticateToken);

// Get table statistics
router.get('/stats', tablesController.getTableStats);

// Get table by ID
router.get('/:id', tablesController.getTableById);

// Create new table (receptionist, admin, manager)
router.post('/', 
  authorizeRoles('receptionist', 'admin', 'manager'), 
  tablesController.createTable
);

// Update table (waiter, receptionist, admin, manager)
router.put('/:id', 
  authorizeRoles('waiter', 'receptionist', 'admin', 'manager'), 
  tablesController.updateTable
);

// Delete table (admin, manager)
router.delete('/:id', 
  authorizeRoles('admin', 'manager'), 
  tablesController.deleteTable
);

export default router;