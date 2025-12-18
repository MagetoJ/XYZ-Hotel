import express from 'express';
import { authenticateToken } from '../middleware/auth';
import * as settingsController from '../controllers/settingsController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all settings
router.get('/', settingsController.getAllSettings);

// Update settings
router.post('/', settingsController.updateSettings);
router.put('/', settingsController.updateSettings);

// Get specific setting by key
router.get('/:key', settingsController.getSettingByKey);

// Update specific setting
router.put('/:key', settingsController.updateSetting);

export default router;