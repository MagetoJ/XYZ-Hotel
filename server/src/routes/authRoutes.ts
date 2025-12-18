import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/login', authController.login);
router.post('/validate-pin', authController.validatePin);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/logout', authenticateToken, authController.logout);
router.post('/change-password/initiate', authenticateToken, authController.initiatePasswordChange);
router.post('/change-password/confirm', authenticateToken, authController.confirmPasswordChange);

export default router;