import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import * as settingsController from '../controllers/settingsController';

const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📂 Created uploads directory at:', uploadDir);
}

const upload = multer({
  dest: 'public/uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, JPEG, GIF, WebP) are allowed'));
    }
  }
});

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all settings
router.get('/', settingsController.getAllSettings);

// Update settings - Restricted to Superadmin for business branding
router.post('/', authorizeRoles('superadmin'), settingsController.updateSettings);
router.put('/', authorizeRoles('superadmin'), settingsController.updateSettings);

// Upload logo - Restricted to Superadmin only
const handleUploadError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message || 'File upload failed' });
  }
  next();
};

router.post('/upload/logo',
  authorizeRoles('superadmin'),
  upload.single('logo'),
  handleUploadError,
  settingsController.uploadLogo
);

// Get specific setting by key
router.get('/:key', settingsController.getSettingByKey);

// Update specific setting
router.put('/:key', settingsController.updateSetting);

export default router;