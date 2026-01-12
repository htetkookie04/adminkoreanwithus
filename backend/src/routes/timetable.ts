import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
  getTimetable,
  getTimetableEntry,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  updateTimetableStatus
} from '../controllers/timetableController';

export const timetableRouter = Router();

// Public route for viewing timetable (no auth required)
timetableRouter.get('/public', getTimetable);

// Protected admin routes
timetableRouter.use(authenticate);

timetableRouter.get('/', requirePermission('courses', 'view'), getTimetable);
timetableRouter.get('/:id', requirePermission('courses', 'view'), getTimetableEntry);
timetableRouter.post('/', requirePermission('courses', 'create'), createTimetableEntry);
// Status update route - accessible by teachers and admins
timetableRouter.patch('/:id/status', requirePermission('courses', 'view'), updateTimetableStatus);
timetableRouter.put('/:id', requirePermission('courses', 'update'), updateTimetableEntry);
timetableRouter.delete('/:id', requirePermission('courses', 'delete'), deleteTimetableEntry);

