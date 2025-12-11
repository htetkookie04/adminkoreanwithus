import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getRoles } from '../controllers/rolesController';

export const rolesRouter = Router();

// Roles endpoint is accessible to all authenticated users (needed for user creation forms)
rolesRouter.use(authenticate);

// GET /roles - Get all roles
rolesRouter.get('/', getRoles);

