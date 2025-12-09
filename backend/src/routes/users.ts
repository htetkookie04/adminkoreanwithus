import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  debugMockUsers
} from '../controllers/usersController';

export const usersRouter = Router();

usersRouter.use(authenticate);

// Debug endpoint (mock mode only)
usersRouter.get('/debug/credentials', debugMockUsers);

usersRouter.get('/', requirePermission('users', 'view'), getUsers);
usersRouter.get('/:id', requirePermission('users', 'view'), getUser);
usersRouter.post('/', requirePermission('users', 'create'), createUser);
usersRouter.put('/:id', requirePermission('users', 'update'), updateUser);
usersRouter.delete('/:id', requirePermission('users', 'delete'), deleteUser);

