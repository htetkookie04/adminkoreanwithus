import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// GET /analytics/dashboard - Get dashboard statistics
export const getDashboardAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get all counts in parallel
    const [
      userCount,
      courseCount,
      enrollmentCount,
      lectureCount,
      timetableCount,
      activeEnrollments,
      pendingEnrollments,
      activeUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.course.count({ where: { active: true } }),
      prisma.enrollment.count(),
      prisma.lecture.count(),
      prisma.schedule.count(),
      prisma.enrollment.count({ where: { status: 'active' } }),
      prisma.enrollment.count({ where: { status: 'pending' } }),
      prisma.user.count({ where: { status: 'active' } })
    ]);

    // Get recent enrollments (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentEnrollments = await prisma.enrollment.count({
      where: {
        enrolledAt: {
          gte: sevenDaysAgo
        }
      }
    });

    // Get enrollments by status
    const enrollmentsByStatusResult = await prisma.enrollment.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const enrollmentsByStatus = enrollmentsByStatusResult.reduce((acc: any, row: any) => {
      acc[row.status] = row._count.id;
      return acc;
    }, {});

    // Get users by role
    const usersByRoleResult = await prisma.user.groupBy({
      by: ['roleId'],
      _count: {
        id: true
      }
    });

    // Get role names
    const roleIds = usersByRoleResult.map(r => r.roleId);
    const roles = await prisma.role.findMany({
      where: {
        id: { in: roleIds }
      },
      select: {
        id: true,
        name: true
      }
    });

    const roleMap = roles.reduce((acc: any, role: any) => {
      acc[role.id] = role.name;
      return acc;
    }, {});

    const usersByRole = usersByRoleResult.reduce((acc: any, row: any) => {
      const roleName = roleMap[row.roleId] || 'unknown';
      acc[roleName] = row._count.id;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        userCount,
        courseCount,
        enrollmentCount,
        lectureCount,
        timetableCount,
        activeEnrollments,
        pendingEnrollments,
        activeUsers,
        recentEnrollments,
        enrollmentsByStatus,
        usersByRole
      }
    });
  } catch (error) {
    next(error);
  }
};
