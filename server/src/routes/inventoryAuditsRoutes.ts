import { Router } from 'express';
import * as inventoryAuditsController from '../controllers/inventoryAuditsController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All inventory audit routes require authentication
router.use(authenticateToken);

// Only admin and manager can access inventory audit routes
router.use(authorizeRoles('admin', 'manager'));

// Get all inventory audits
router.get('/', inventoryAuditsController.getInventoryAudits);

// Get inventory audit by ID with line items
router.get('/:id', inventoryAuditsController.getInventoryAuditById);

// Get variance report for an audit
router.get('/:id/variance-report', inventoryAuditsController.getVarianceReport);

// Start new inventory audit/stock take
router.post('/', inventoryAuditsController.startInventoryAudit);

// Update audit line item with physical count
router.put('/line-items/:id', inventoryAuditsController.updateAuditLineItem);

// Complete inventory audit and generate report
router.post('/:id/complete', inventoryAuditsController.completeInventoryAudit);

// Cancel inventory audit
router.patch('/:id/cancel', inventoryAuditsController.cancelInventoryAudit);

export default router;