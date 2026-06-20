import express from 'express';
import { 
  saveCategory, 
  getCategories, 
  getCategoriesByType, 
  updateCategory, 
  deleteCategory 
} from '../controllers/categoryController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateJWT);

// Maps POST /api/categories
router.post('/', saveCategory);

// Maps GET /api/categories
router.get('/', getCategories);

// Maps GET /api/categories/type (e.g. /api/categories/type?type=INCOME)
router.get('/type', getCategoriesByType);

// Maps PUT /api/categories/:id
router.put('/:id', updateCategory);

// Maps DELETE /api/categories/:id
router.delete('/:id', deleteCategory);

export default router;
