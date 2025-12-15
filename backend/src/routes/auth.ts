import { Router } from 'express';
import { login, refresh, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

export const authRouter = Router();

// Handle OPTIONS preflight requests for auth routes
authRouter.options('/login', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(204);
});

authRouter.options('/refresh', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(204);
});

authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', authenticate, logout);

