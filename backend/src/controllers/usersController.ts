import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      q,
      role,
      status,
      page = '1',
      per_page = '20',
      sort_by = 'createdAt',
      order = 'desc'
    } = req.query;

    const limit = parseInt(per_page as string);
    const skip = (parseInt(page as string) - 1) * limit;

    // Build where clause
    const where: any = {};

    if (q) {
      const searchTerm = `%${q}%`;
      where.OR = [
        { email: { contains: q as string, mode: 'insensitive' } },
        { firstName: { contains: q as string, mode: 'insensitive' } },
        { lastName: { contains: q as string, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = {
        name: role as string
      };
    }

    if (status) {
      where.status = status as string;
    }

    // Map sort_by to Prisma field names
    const sortFieldMap: Record<string, string> = {
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'last_login_at': 'lastLoginAt',
      'email': 'email',
      'first_name': 'firstName',
      'last_name': 'lastName'
    };
    const sortField = sortFieldMap[sort_by as string] || 'createdAt';

    // Get users with role
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          role: true
        },
        orderBy: {
          [sortField]: order === 'asc' ? 'asc' : 'desc'
        },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    // Format response to match expected format
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      role_id: user.roleId,
      role_name: user.role.name,
      status: user.status,
      created_at: user.createdAt,
      last_login_at: user.lastLoginAt,
      updated_at: user.updatedAt
    }));

    res.json({
      success: true,
      data: formattedUsers,
      pagination: {
        page: parseInt(page as string),
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        role: true
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Format response to match expected format
    const formattedUser = {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      role_id: user.roleId,
      role_name: user.role.name,
      status: user.status,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      last_login_at: user.lastLoginAt
    };

    res.json({
      success: true,
      data: formattedUser
    });
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

    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      throw new AppError('Email already exists', 409);
    }

    // Password is required for new users
    if (!password || password.trim().length === 0) {
      throw new AppError('Password is required', 400);
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        roleId: roleId || 8, // Default to User role (8)
        status: status || 'active'
      },
      include: {
        role: true
      }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'user.created',
          resourceType: 'user',
          resourceId: user.id
        }
      });
    }

    // Format response
    const formattedUser = {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      role_id: user.roleId,
      status: user.status,
      created_at: user.createdAt
    };

    res.status(201).json({
      success: true,
      data: formattedUser
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, roleId, status } = req.body;

    // Build update data
    const updateData: any = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (roleId !== undefined) updateData.roleId = roleId;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        role: true
      }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'user.updated',
          resourceType: 'user',
          resourceId: parseInt(id),
          meta: { changes: req.body }
        }
      });
    }

    // Format response
    const formattedUser = {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      role_id: user.roleId,
      status: user.status,
      updated_at: user.updatedAt
    };

    res.json({
      success: true,
      data: formattedUser
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma record not found
      throw new AppError('User not found', 404);
    }
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters long', 400);
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    if (!user.passwordHash) {
      throw new AppError('Password not set for this account', 400);
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { passwordHash }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'user.password_changed',
          resourceType: 'user',
          resourceId: parseInt(id)
        }
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new AppError('User not found', 404);
    }
    next(error);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if user exists before deleting
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Permanently delete user from database
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'user.deleted',
          resourceType: 'user',
          resourceId: parseInt(id)
        }
      });
    }

    res.json({
      success: true,
      message: 'User permanently deleted successfully'
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma record not found
      throw new AppError('User not found', 404);
    }
    next(error);
  }
};
