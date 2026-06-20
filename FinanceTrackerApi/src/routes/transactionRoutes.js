import express from 'express';
import { 
  createTransaction, 
  getTransactions, 
  updateTransaction, 
  deleteTransaction, 
  getRecentTransactions, 
  getSummary,
  exportExcel,
  sendReport,
  getAnalytics,
  predictExpense,
  getSuspiciousTransactions,
  getDailySpending,
  getHealthScore
} from '../controllers/transactionController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all transaction routes
router.use(authenticateJWT);

// Create Transaction
router.post('/', createTransaction);

// Get Transactions (paginated)
router.get('/', getTransactions);

// Get Financial summary (income, expense, balance)
router.get('/summary', getSummary);

// Get Recent transactions (top 5)
router.get('/recent', getRecentTransactions);

// Export transactions to Excel attachment
router.get('/export', exportExcel);

// Send Excel report to registered email
router.post('/send-report', sendReport);

// Advanced Financial Insights
router.get('/analytics', getAnalytics);

// Expense prediction for next month
router.get('/prediction', predictExpense);

// Get suspicious/fraudulent transactions
router.get('/suspicious', getSuspiciousTransactions);

// Daily spending heatmap data
router.get('/daily-spending', getDailySpending);

// Financial Health Score
router.get('/health-score', getHealthScore);

// Update Transaction (needs ID)
router.put('/:id', updateTransaction);

// Delete Transaction (needs ID)
router.delete('/:id', deleteTransaction);

export default router;
