import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// Mock data store for development
export let mockUsers: any[] = [
  {
    id: 1,
    email: 'admin@koreanwithus.com',
    password: 'admin123', // Store plain password in mock mode for easy login
    first_name: 'Admin',
    last_name: 'User',
    phone: '+65-1234-5678',
    role_id: 1,
    role_name: 'super_admin',
    status: 'active',
    created_at: new Date('2024-01-01'),
    last_login_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 2,
    email: 'teacher@koreanwithus.com',
    password: 'teacher123',
    first_name: 'Teacher',
    last_name: 'User',
    phone: '+65-8765-4321',
    role_id: 4,
    role_name: 'teacher',
    status: 'active',
    created_at: new Date('2024-01-15'),
    last_login_at: new Date(),
    updated_at: new Date()
  }
];
let mockUserIdCounter = 3;

const getRoleName = (roleId: number): string => {
  const roles: Record<number, string> = {
    1: 'super_admin',
    2: 'admin',
    3: 'course_manager',
    4: 'teacher',
    5: 'support',
    6: 'sales',
    7: 'viewer',
    8: 'user' // Regular user/student role
  };
  return roles[roleId] || 'user';
};

export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      q,
      role,
      status,
      page = '1',
      per_page = '20',
      sort_by = 'created_at',
      order = 'desc'
    } = req.query;

    const limit = parseInt(per_page as string);
    const offset = (parseInt(page as string) - 1) * limit;

    if (process.env.MOCK_MODE === 'true') {
      // Mock mode filtering
      let filtered = [...mockUsers];

      if (q) {
        const searchLower = (q as string).toLowerCase();
        filtered = filtered.filter(u => 
          u.email.toLowerCase().includes(searchLower) ||
          u.first_name?.toLowerCase().includes(searchLower) ||
          u.last_name?.toLowerCase().includes(searchLower)
        );
      }

      if (role) {
        filtered = filtered.filter(u => u.role_name === role);
      }

      if (status) {
        filtered = filtered.filter(u => u.status === status);
      }

      const total = filtered.length;
      const paginatedData = filtered.slice(offset, offset + limit);

      res.json({
        success: true,
        data: paginatedData,
        pagination: {
          page: parseInt(page as string),
          per_page: limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });
    } else {
      // Database mode
      let query = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.phone, 
               u.role_id, u.status, u.created_at, u.last_login_at,
               r.name as role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (q) {
        paramCount++;
        query += ` AND (u.email ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
        params.push(`%${q}%`);
      }

      if (role) {
        paramCount++;
        query += ` AND r.name = $${paramCount}`;
        params.push(role);
      }

      if (status) {
        paramCount++;
        query += ` AND u.status = $${paramCount}`;
        params.push(status);
      }

      // Count total
      const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add sorting and pagination
      paramCount++;
      query += ` ORDER BY u.${sort_by} ${order.toUpperCase()} LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page as string),
          per_page: limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (process.env.MOCK_MODE === 'true') {
      const user = mockUsers.find(u => u.id === parseInt(id));
      
      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: user
      });
    } else {
      const result = await pool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
                u.role_id, u.status, u.created_at, u.updated_at, u.last_login_at,
                r.name as role_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    }
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, phone, roleId, status } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    if (process.env.MOCK_MODE === 'true') {
      // Check if email exists in mock data
      const existing = mockUsers.find(u => u.email === email);
      if (existing) {
        throw new AppError('Email already exists', 409);
      }

      const newUser = {
        id: mockUserIdCounter++,
        email,
        password: password || 'password123', // Store plain password in mock mode
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
        role_id: roleId || 8, // Default to User role
        role_name: getRoleName(roleId || 8),
        status: status || 'active',
        created_at: new Date(),
        updated_at: new Date(),
        last_login_at: null
      };

      mockUsers.push(newUser);

      console.log('\n🔐 MOCK MODE - User Created:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password || 'password123'}`);
      console.log(`   Role: ${getRoleName(roleId || 8)}`);
      console.log('   ⚠️  Save these credentials for login!\n');

      res.status(201).json({
        success: true,
        data: newUser
      });
    } else {
      // Check if email exists
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        throw new AppError('Email already exists', 409);
      }

      let passwordHash = null;
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, first_name, last_name, phone, role_id, status, created_at`,
        [email, passwordHash, firstName, lastName, phone, roleId || 8, status || 'active']
      );

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
         VALUES ($1, 'user.created', 'user', $2)`,
        [req.user?.id, result.rows[0].id]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    }
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, roleId, status } = req.body;

    if (process.env.MOCK_MODE === 'true') {
      const userIndex = mockUsers.findIndex(u => u.id === parseInt(id));
      
      if (userIndex === -1) {
        throw new AppError('User not found', 404);
      }

      const user = mockUsers[userIndex];
      
      if (firstName !== undefined) user.first_name = firstName;
      if (lastName !== undefined) user.last_name = lastName;
      if (phone !== undefined) user.phone = phone;
      if (roleId !== undefined) {
        user.role_id = roleId;
        user.role_name = getRoleName(roleId);
      }
      if (status !== undefined) user.status = status;
      user.updated_at = new Date();

      res.json({
        success: true,
        data: user
      });
    } else {
      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (firstName !== undefined) {
        paramCount++;
        updates.push(`first_name = $${paramCount}`);
        params.push(firstName);
      }
      if (lastName !== undefined) {
        paramCount++;
        updates.push(`last_name = $${paramCount}`);
        params.push(lastName);
      }
      if (phone !== undefined) {
        paramCount++;
        updates.push(`phone = $${paramCount}`);
        params.push(phone);
      }
      if (roleId !== undefined) {
        paramCount++;
        updates.push(`role_id = $${paramCount}`);
        params.push(roleId);
      }
      if (status !== undefined) {
        paramCount++;
        updates.push(`status = $${paramCount}`);
        params.push(status);
      }

      if (updates.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      paramCount++;
      updates.push(`updated_at = now()`);
      paramCount++;
      params.push(id);

      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
         RETURNING id, email, first_name, last_name, phone, role_id, status, updated_at`,
        params
      );

      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, meta)
         VALUES ($1, 'user.updated', 'user', $2, $3)`,
        [req.user?.id, id, JSON.stringify({ changes: req.body })]
      );

      res.json({
        success: true,
        data: result.rows[0]
      });
    }
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (process.env.MOCK_MODE === 'true') {
      const userIndex = mockUsers.findIndex(u => u.id === parseInt(id));
      
      if (userIndex === -1) {
        throw new AppError('User not found', 404);
      }

      // Soft delete (set status to archived)
      mockUsers[userIndex].status = 'archived';
      mockUsers[userIndex].updated_at = new Date();

      res.json({
        success: true,
        message: 'User archived successfully'
      });
    } else {
      // Soft delete (set status to archived)
      const result = await pool.query(
        `UPDATE users SET status = 'archived', updated_at = now() WHERE id = $1
         RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
         VALUES ($1, 'user.deleted', 'user', $2)`,
        [req.user?.id, id]
      );

      res.json({
        success: true,
        message: 'User archived successfully'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Debug endpoint for mock mode - shows all users with passwords
export const debugMockUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (process.env.MOCK_MODE !== 'true') {
      throw new AppError('This endpoint is only available in mock mode', 403);
    }

    const userCredentials = mockUsers
      .filter(u => u.status === 'active')
      .map(u => ({
        id: u.id,
        email: u.email,
        password: u.password,
        name: `${u.first_name} ${u.last_name}`,
        role: u.role_name
      }));

    res.json({
      success: true,
      message: '🔐 Mock Mode User Credentials (for development only)',
      data: userCredentials
    });
  } catch (error) {
    next(error);
  }
};

