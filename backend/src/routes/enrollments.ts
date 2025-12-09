import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
  getEnrollments,
  getEnrollment,
  createEnrollment,
  updateEnrollment,
  approveEnrollment,
  rejectEnrollment
} from '../controllers/enrollmentsController';

export const enrollmentsRouter = Router();

enrollmentsRouter.use(authenticate);

enrollmentsRouter.get('/', requirePermission('enrollments', 'view'), getEnrollments);
enrollmentsRouter.get('/:id', requirePermission('enrollments', 'view'), getEnrollment);
enrollmentsRouter.post('/', requirePermission('enrollments', 'create'), createEnrollment);
enrollmentsRouter.put('/:id', requirePermission('enrollments', 'update'), updateEnrollment);
enrollmentsRouter.post('/:id/approve', requirePermission('enrollments', 'approve'), approveEnrollment);
enrollmentsRouter.post('/:id/reject', requirePermission('enrollments', 'update'), rejectEnrollment);

