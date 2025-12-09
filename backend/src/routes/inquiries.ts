import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
  getInquiries,
  getInquiry,
  createInquiry,
  updateInquiry,
  addReply
} from '../controllers/inquiriesController';

export const inquiriesRouter = Router();

// Public route for contact form
inquiriesRouter.post('/', createInquiry);

// Protected routes
inquiriesRouter.use(authenticate);
inquiriesRouter.get('/', requirePermission('inquiries', 'view'), getInquiries);
inquiriesRouter.get('/:id', requirePermission('inquiries', 'view'), getInquiry);
inquiriesRouter.put('/:id', requirePermission('inquiries', 'update'), updateInquiry);
inquiriesRouter.post('/:id/replies', requirePermission('inquiries', 'update'), addReply);

