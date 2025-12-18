import { Router } from 'express';
import * as attendanceController from '../controllers/attendanceController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All attendance routes require authentication
router.use(authenticateToken);

// Clock in
router.post('/clock-in', attendanceController.clockIn);

// Clock out
router.post('/clock-out', attendanceController.clockOut);

// Get current attendance status
router.get('/status', attendanceController.getCurrentStatus);

// Get attendance history (with role-based access control in controller)
router.get('/history', attendanceController.getAttendanceHistory);

export default router;