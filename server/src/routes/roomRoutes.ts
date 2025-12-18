import { Router } from 'express';
import * as roomController from '../controllers/roomController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All room routes require authentication
router.use(authenticateToken);

// Get all rooms (available to all authenticated users)
router.get('/', roomController.getRooms);

// Get room statistics
router.get('/stats', roomController.getRoomStats);

// Get specific room by ID
router.get('/:id', roomController.getRoomById);

// Create new room (admin and manager only)
router.post('/', 
  authorizeRoles('admin', 'manager'), 
  roomController.createRoom
);

// Update room (admin, manager, receptionist, housekeeping)
router.put('/:id', 
  authorizeRoles('admin', 'manager', 'receptionist', 'housekeeping'), 
  roomController.updateRoom
);

// Delete room (admin and manager only)
router.delete('/:id', 
  authorizeRoles('admin', 'manager'), 
  roomController.deleteRoom
);

// Room check-in and check-out (receptionist, admin, manager)
router.post('/:roomId/check-in', 
  authorizeRoles('receptionist', 'admin', 'manager'), 
  roomController.checkInRoom
);

router.post('/:roomId/check-out', 
  authorizeRoles('receptionist', 'admin', 'manager'), 
  roomController.checkOutRoom
);

export default router;