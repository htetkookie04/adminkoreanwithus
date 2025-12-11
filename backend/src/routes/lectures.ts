import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getLectures,
  getLecture,
  createLecture,
  updateLecture,
  deleteLecture,
  getLecturesByCourse,
  uploadFiles
} from '../controllers/lecturesController';

export const lecturesRouter = Router();

// All routes require authentication
lecturesRouter.use(authenticate);

// GET /lectures - List lectures (role-based access)
lecturesRouter.get('/', getLectures);

// GET /lectures/course/:courseId - Get lectures for a course
lecturesRouter.get('/course/:courseId', getLecturesByCourse);

// GET /lectures/:id - Get single lecture
lecturesRouter.get('/:id', getLecture);

// POST /lectures - Create lecture (admin/teacher only)
lecturesRouter.post(
  '/',
  requireRole('admin', 'super_admin', 'teacher'),
  uploadFiles.fields([
    { name: 'video', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
  ]),
  createLecture
);

// PUT /lectures/:id - Update lecture (admin/teacher only)
lecturesRouter.put(
  '/:id',
  requireRole('admin', 'super_admin', 'teacher'),
  updateLecture
);

// DELETE /lectures/:id - Delete lecture (admin only)
lecturesRouter.delete(
  '/:id',
  requireRole('admin', 'super_admin'),
  deleteLecture
);

