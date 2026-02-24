import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    roleId: number;
    roleName: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as {
      id: number;
      email: string;
      roleId: number;
      roleName: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.roleName)) {
      // Log unauthorized role access attempt
      if (req.user?.id) {
        prisma.activityLog.create({
          data: {
            userId: req.user.id,
            action: 'role.access.denied',
            resourceType: 'system',
            meta: {
              userRole: req.user.roleName,
              requiredRoles: allowedRoles,
              ipAddress: req.ip,
              userAgent: req.get('user-agent')
            }
          }
        }).catch(err => console.error('Failed to log role denial:', err));
      }
      
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

/**
 * Check if user owns a resource or has admin role
 */
export const checkOwnership = (getResourceOwnerId: (req: AuthRequest) => Promise<number | null>) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Super admin and admin can access any resource
    if (req.user.roleName === 'super_admin' || req.user.roleName === 'admin') {
      return next();
    }

    try {
      const resourceOwnerId = await getResourceOwnerId(req);
      
      if (resourceOwnerId === null) {
        return next(new AppError('Resource not found', 404));
      }

      if (resourceOwnerId !== req.user.id) {
        // Log unauthorized access attempt
        await prisma.activityLog.create({
          data: {
            userId: req.user.id,
            action: 'ownership.access.denied',
            resourceType: req.params.id ? 'resource' : 'unknown',
            resourceId: req.params.id ? parseInt(req.params.id) : null,
            meta: {
              resourceOwnerId,
              attemptedUserId: req.user.id,
              ipAddress: req.ip,
              userAgent: req.get('user-agent')
            }
          }
        }).catch(err => console.error('Failed to log ownership denial:', err));
        
        return next(new AppError('Access denied: You can only access your own resources', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requirePermission = (resource: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Super admin bypasses all permission checks
    if (req.user.roleName === 'super_admin') {
      return next();
    }

    // Check permission from database
    const hasPermission = await prisma.rolePermission.findFirst({
      where: {
        roleId: req.user.roleId,
        permission: {
          resource,
          action
        }
      },
      include: {
        permission: true
      }
    });

    if (!hasPermission) {
      // Log unauthorized access attempt
      if (req.user?.id) {
        await prisma.activityLog.create({
          data: {
            userId: req.user.id,
            action: 'permission.denied',
            resourceType: resource,
            meta: {
              attemptedAction: action,
              resource,
              ipAddress: req.ip,
              userAgent: req.get('user-agent')
            }
          }
        }).catch(err => console.error('Failed to log permission denial:', err));
      }
      
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

