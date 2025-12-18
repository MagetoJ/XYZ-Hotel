import { Router } from 'express';
import * as wastageController from '../controllers/wastageController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All wastage routes require authentication
router.use(authenticateToken);

// Get all wastage logs
router.get('/', wastageController.getWastageLogs);

// Get wastage log by ID
router.get('/:id', wastageController.getWastageLogById);

// Get wastage summary
router.get('/summary/data', wastageController.getWastageSummary);

// Create wastage log (allowed for staff, kitchen, managers)
router.post('/', authorizeRoles('staff', 'kitchen', 'kitchen_staff', 'manager', 'admin'), wastageController.createWastageLog);

// Delete wastage log (only admin and manager)
router.delete('/:id', authorizeRoles('manager', 'admin'), wastageController.deleteWastageLog);

export default router;