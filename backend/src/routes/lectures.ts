import { Router, Request, Response, NextFunction } from 'express';
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

// Multer error handling wrapper
const handleMulterError = (req: Request, res: Response, next: NextFunction) => {
  const multerMiddleware = uploadFiles.fields([
    { name: 'video', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
  ]);
  
  multerMiddleware(req, res, (err: any) => {
    if (err) {
      return next(err);
    }
    next();
  });
};

// POST /lectures - Create lecture (admin/teacher only)
lecturesRouter.post(
  '/',
  requireRole('admin', 'super_admin', 'teacher'),
  handleMulterError,
  createLecture
);

// PUT /lectures/:id - Update lecture (admin/teacher only)
lecturesRouter.put(
  '/:id',
  requireRole('admin', 'super_admin', 'teacher'),
  handleMulterError,
  updateLecture
);

// DELETE /lectures/:id - Delete lecture (admin only)
lecturesRouter.delete(
  '/:id',
  requireRole('admin', 'super_admin'),
  deleteLecture
);

