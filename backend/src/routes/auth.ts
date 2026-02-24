import { Router } from 'express';
import { login, refresh, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

export const authRouter = Router();

// SECURITY: Do NOT set Access-Control-Allow-Origin from req.headers.origin — that would
// allow any origin (CORS bypass). Let the global cors(corsOptions) in index.ts handle
// preflight; remove custom OPTIONS so preflight uses the same whitelist.
// OPTIONS /api/auth/login and /api/auth/refresh are handled by app.options('*', cors(corsOptions)).

// SECURITY: Apply strict rate limiting to authentication endpoints
authRouter.post('/login', authLimiter, login);
authRouter.post('/refresh', authLimiter, refresh);
authRouter.post('/logout', authenticate, logout);

