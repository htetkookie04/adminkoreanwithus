import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { getDashboardAnalytics } from '../controllers/analyticsController';

export const analyticsRouter = Router();

// All routes require authentication
analyticsRouter.use(authenticate);

// GET /analytics/dashboard - Get dashboard statistics
analyticsRouter.get('/dashboard', requirePermission('reports', 'view'), getDashboardAnalytics);

