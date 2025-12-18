import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import * as inventoryController from '../controllers/inventoryController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📂 Created missing uploads directory at:', uploadDir);
}

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
      'application/pdf'
    ];

    if (allowedTypes.includes(file.mimetype) ||
        file.originalname.endsWith('.csv') ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls') ||
        file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, Excel, and PDF files are allowed'));
    }
  }
});

const router = Router();

// All inventory routes require authentication
router.use(authenticateToken);

// Get inventory (role-based filtering applied in controller)
router.get('/', inventoryController.getInventory);

// Upload CSV for bulk inventory update
const handleUploadError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message || 'File upload failed' });
  }
  next();
};

router.post('/upload',
  authorizeRoles('admin', 'manager', 'kitchen_staff', 'receptionist'),
  upload.single('file'),
  handleUploadError,
  inventoryController.uploadInventory
);

// Create inventory item (admin, manager, or specific role-based permissions)
router.post('/', 
  authorizeRoles('admin', 'manager', 'kitchen_staff', 'receptionist', 'housekeeping', 'quick_pos', 'waiter'), 
  inventoryController.createInventoryItem
);

// Update inventory item
router.put('/:id', 
  authorizeRoles('admin', 'manager', 'kitchen_staff', 'receptionist', 'housekeeping', 'quick_pos', 'waiter'), 
  inventoryController.updateInventoryItem
);

// Update stock quantity only
router.put('/:id/stock', inventoryController.updateStock);

// Delete inventory item
router.delete('/:id', 
  authorizeRoles('admin', 'manager'), 
  inventoryController.deleteInventoryItem
);

export default router;