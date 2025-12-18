import { Router } from 'express';
import * as expensesController from '../controllers/expensesController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All expense routes require authentication
router.use(authenticateToken);

// Only admin and manager can access expense routes
router.use(authorizeRoles('admin', 'manager'));

// Get expense summary - MUST be before /:id route
router.get('/summary', expensesController.getExpenseSummary);

// Get all expenses with optional filtering
router.get('/', expensesController.getExpenses);

// Get expense by ID
router.get('/:id', expensesController.getExpenseById);

// Create new expense
router.post('/', expensesController.createExpense);

// Update expense
router.put('/:id', expensesController.updateExpense);

// Delete expense
router.delete('/:id', expensesController.deleteExpense);

export default router;