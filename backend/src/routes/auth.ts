import { Router } from 'express';
import { login, refresh, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', authenticate, logout);

