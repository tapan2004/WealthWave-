import express from 'express';
import { 
  createBudget, 
  getBudgets, 
  checkBudgets, 
  updateBudget, 
  deleteBudget 
} from '../controllers/budgetController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all budget routes
router.use(authenticateJWT);

// Maps POST /api/budgets
router.post('/', createBudget);

// Maps GET /api/budgets
router.get('/', getBudgets);

// Maps GET /api/budgets/check
router.get('/check', checkBudgets);

// Maps PUT /api/budgets/:id
router.put('/:id', updateBudget);

// Maps DELETE /api/budgets/:id
router.delete('/:id', deleteBudget);

export default router;
