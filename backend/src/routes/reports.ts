import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
  getEnrollmentReport,
  getAISummary
} from '../controllers/reportsController';

export const reportsRouter = Router();

reportsRouter.use(authenticate);
reportsRouter.use(requirePermission('reports', 'view'));

reportsRouter.get('/enrollments', getEnrollmentReport);
reportsRouter.get('/ai-summary', getAISummary);

