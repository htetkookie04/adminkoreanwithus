import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  changePassword
} from '../controllers/usersController';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get('/', requirePermission('users', 'view'), getUsers);
usersRouter.get('/:id', requirePermission('users', 'view'), getUser);
usersRouter.post('/', requirePermission('users', 'create'), createUser);
usersRouter.put('/:id', requirePermission('users', 'update'), updateUser);
usersRouter.post('/:id/change-password', changePassword); // Allow users to change their own password
usersRouter.delete('/:id', requirePermission('users', 'delete'), deleteUser);

