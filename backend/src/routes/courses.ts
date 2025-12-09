import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseSchedules,
  createSchedule
} from '../controllers/coursesController';

export const coursesRouter = Router();

coursesRouter.use(authenticate);

coursesRouter.get('/', requirePermission('courses', 'view'), getCourses);
coursesRouter.get('/:id', requirePermission('courses', 'view'), getCourse);
coursesRouter.post('/', requirePermission('courses', 'create'), createCourse);
coursesRouter.put('/:id', requirePermission('courses', 'update'), updateCourse);
coursesRouter.delete('/:id', requirePermission('courses', 'delete'), deleteCourse);
coursesRouter.get('/:id/schedules', requirePermission('courses', 'view'), getCourseSchedules);
coursesRouter.post('/:id/schedules', requirePermission('courses', 'create'), createSchedule);

