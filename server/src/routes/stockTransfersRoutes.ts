import { Router } from 'express';
import * as stockTransfersController from '../controllers/stockTransfersController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All stock transfer routes require authentication
router.use(authenticateToken);

// Get all stock transfers
router.get('/', stockTransfersController.getStockTransfers);

// Get stock transfer by ID
router.get('/:id', stockTransfersController.getStockTransferById);

// Create stock transfer (only managers and admins)
router.post('/', authorizeRoles('manager', 'admin'), stockTransfersController.createStockTransfer);

// Receive/Complete stock transfer (only managers and admins)
router.post('/:id/receive', authorizeRoles('manager', 'admin'), stockTransfersController.receiveStockTransfer);

// Cancel stock transfer (only managers and admins)
router.patch('/:id/cancel', authorizeRoles('manager', 'admin'), stockTransfersController.cancelStockTransfer);

export default router;