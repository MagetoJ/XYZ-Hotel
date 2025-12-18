import { Router } from 'express'; 
import multer from 'multer'; 
import fs from 'fs'; 
import path from 'path'; 
import * as productController from '../controllers/productController'; 
import { authenticateToken, authorizeRoles } from '../middleware/auth'; 
  
const uploadDir = path.join(__dirname, '../../uploads'); 
if (!fs.existsSync(uploadDir)) {  
  fs.mkdirSync(uploadDir, { recursive: true }); 
} 
  
const upload = multer({ 
  dest: 'uploads/', 
  fileFilter: (req, file, cb) => { 
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']; 
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/)) { 
      cb(null, true); 
    } else { 
      cb(new Error('Only CSV and Excel files are allowed')); 
    } 
  } 
}); 
  
const router = Router(); 
  
router.get('/', productController.getProducts); 
router.get('/categories', productController.getProductCategories); 

router.use(authenticateToken); 

// CRITICAL: Define specific routes BEFORE generic /:id
// /export must come before /:id, otherwise "/:id" matches "/export" as id="export"
router.get('/export', authorizeRoles('admin', 'manager'), productController.exportProducts); 
router.post('/upload', authorizeRoles('admin', 'manager'), upload.single('file'), productController.uploadProducts); 
  
// Now define generic ID route
router.get('/:id', productController.getProductById); 
  
router.post('/', authorizeRoles('admin', 'manager'), productController.createProduct); 
router.put('/:id', authorizeRoles('admin', 'manager'), productController.updateProduct); 
router.patch('/:id/toggle-availability', authorizeRoles('admin', 'manager', 'kitchen_staff'), productController.toggleProductAvailability); 
router.delete('/:id', authorizeRoles('admin'), productController.deleteProduct); 
  
export default router;
