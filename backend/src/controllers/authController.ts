import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { AppError } from '../middleware/errorHandler';
import { mockUsers } from './usersController';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    let user;

    // Mock mode for development without database
    if (process.env.MOCK_MODE === 'true') {
      const mockUser = mockUsers.find(u => u.email === email);
      
      if (!mockUser || mockUser.password !== password) {
        throw new AppError('Invalid credentials', 401);
      }

      if (mockUser.status !== 'active') {
        throw new AppError('Account is suspended or archived', 403);
      }

      user = mockUser;
    } else {
      // Database mode
      // Find user
      const userResult = await pool.query(
        `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, 
                u.role_id, u.status, r.name as role_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.email = $1`,
        [email]
      );

      if (userResult.rows.length === 0) {
        throw new AppError('Invalid credentials', 401);
      }

      user = userResult.rows[0];

      if (user.status !== 'active') {
        throw new AppError('Account is suspended or archived', 403);
      }

      // Verify password
      if (!user.password_hash) {
        throw new AppError('Password not set for this account', 401);
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401);
      }

      // Update last login
      await pool.query(
        'UPDATE users SET last_login_at = now() WHERE id = $1',
        [user.id]
      );
    }

    // Generate tokens
    const jwtSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    if (!jwtSecret || !refreshSecret) {
      throw new Error('JWT secrets not configured');
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roleId: user.role_id,
        roleName: user.role_name
      },
      jwtSecret,
      { expiresIn }
    );

    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      refreshSecret,
      { expiresIn: refreshExpiresIn }
    );

    // TODO: Store refresh token in database (refresh_tokens table)

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          roleId: user.role_id,
          roleName: user.role_name
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET not configured');
    }

    const decoded = jwt.verify(refreshToken, refreshSecret) as { id: number; type: string };

    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type', 401);
    }

    // Get user
    const userResult = await pool.query(
      `SELECT u.id, u.email, u.role_id, r.name as role_name, u.status
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].status !== 'active') {
      throw new AppError('User not found or inactive', 401);
    }

    const user = userResult.rows[0];
    const jwtSecret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '15m';

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roleId: user.role_id,
        roleName: user.role_name
      },
      jwtSecret,
      { expiresIn }
    );

    res.json({
      success: true,
      data: { accessToken }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Invalidate refresh token in database
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

