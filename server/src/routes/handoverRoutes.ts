import { Router } from 'express';
import * as handoverController from '../controllers/handoverController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get(
  '/',
  authorizeRoles('receptionist', 'admin', 'manager'),
  handoverController.getLogs
);

router.post(
  '/',
  authorizeRoles('receptionist', 'admin', 'manager'),
  handoverController.createLog
);

router.patch(
  '/:id/resolve',
  authorizeRoles('receptionist', 'admin', 'manager'),
  handoverController.markResolved
);

router.delete(
  '/:id',
  authorizeRoles('receptionist', 'admin', 'manager'),
  handoverController.deleteLog
);

export default router;