import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
  getGallery,
  getGalleryPublic,
  createGalleryEntry,
  updateGalleryEntry,
  reorderGallery,
  deleteGalleryEntry,
  upload
} from '../controllers/galleryController';

export const galleryRouter = Router();

// Public route for viewing gallery (no auth required)
galleryRouter.get('/public', getGalleryPublic);

// Protected admin routes
galleryRouter.use(authenticate);

galleryRouter.get('/', requirePermission('courses', 'view'), getGallery);
galleryRouter.post('/', requirePermission('courses', 'create'), upload.single('image'), createGalleryEntry);
galleryRouter.put('/:id', requirePermission('courses', 'update'), updateGalleryEntry);
galleryRouter.post('/reorder', requirePermission('courses', 'update'), reorderGallery);
galleryRouter.delete('/:id', requirePermission('courses', 'delete'), deleteGalleryEntry);

