import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  getCategories,
  createCategory,
  updateCategory
} from '../../controllers/financeCategoriesController';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction
} from '../../controllers/financeTransactionsController';
import {
  getAllReport,
  getYearlyReport,
  getMonthlyReport,
  getDailyReport
} from '../../controllers/financeReportsController';

export const financeRouter = Router();

financeRouter.use(authenticate);
financeRouter.use(requireRole('super_admin', 'admin'));

// Categories
financeRouter.get('/categories', getCategories);
financeRouter.post('/categories', createCategory);
financeRouter.patch('/categories/:id', updateCategory);

// Transactions
financeRouter.get('/transactions', getTransactions);
financeRouter.post('/transactions', createTransaction);
financeRouter.patch('/transactions/:id', updateTransaction);
financeRouter.delete('/transactions/:id', deleteTransaction);

// Reports
financeRouter.get('/reports/all', getAllReport);
financeRouter.get('/reports/yearly', getYearlyReport);
financeRouter.get('/reports/monthly', getMonthlyReport);
financeRouter.get('/reports/daily', getDailyReport);
