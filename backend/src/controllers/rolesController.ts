import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getRoles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: {
        id: 'asc'
      },
      select: {
        id: true,
        name: true,
        description: true
      }
    });

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    next(error);
  }
};

