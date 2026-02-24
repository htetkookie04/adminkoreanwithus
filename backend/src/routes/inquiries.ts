import { Router, RequestHandler } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { inquiryLimiter } from '../middleware/rateLimiter';
import {
  getInquiries,
  getInquiry,
  createInquiry,
  updateInquiry,
  addReply
} from '../controllers/inquiriesController';

export const inquiriesRouter = Router();

// Public route for contact form — SECURITY: rate limit to prevent spam/DoS
inquiriesRouter.post('/', inquiryLimiter, createInquiry as unknown as RequestHandler);

// Protected routes
inquiriesRouter.use(authenticate);
inquiriesRouter.get('/', requirePermission('inquiries', 'view'), getInquiries);
inquiriesRouter.get('/:id', requirePermission('inquiries', 'view'), getInquiry);
inquiriesRouter.put('/:id', requirePermission('inquiries', 'update'), updateInquiry);
inquiriesRouter.post('/:id/replies', requirePermission('inquiries', 'update'), addReply);

