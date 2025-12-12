import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getEnrollments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      courseId,
      userId,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      page = '1',
      per_page = '20'
    } = req.query;

    const limit = parseInt(per_page as string);
    const skip = (parseInt(page as string) - 1) * limit;

    // Build where clause
    const where: any = {};

    if (courseId) {
      where.courseId = parseInt(courseId as string);
    }

    if (userId) {
      where.userId = parseInt(userId as string);
    }

    if (status) {
      where.status = status as string;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus as string;
    }

    if (dateFrom || dateTo) {
      where.enrolledAt = {};
      if (dateFrom) {
        where.enrolledAt.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.enrolledAt.lte = new Date(dateTo as string);
      }
    }

    // Get enrollments with relations
    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          course: {
            select: {
              id: true,
              title: true,
              level: true
            }
          },
          schedule: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              location: true
            }
          }
        },
        orderBy: {
          enrolledAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.enrollment.count({ where })
    ]);

    // Format response
    const formattedEnrollments = enrollments.map(enrollment => ({
      id: enrollment.id,
      status: enrollment.status,
      enrolled_at: enrollment.enrolledAt,
      notes: enrollment.notes,
      source: enrollment.source,
      payment_status: enrollment.paymentStatus,
      created_at: enrollment.createdAt,
      updated_at: enrollment.updatedAt,
      user_id: enrollment.userId,
      email: enrollment.user?.email,
      first_name: enrollment.user?.firstName,
      last_name: enrollment.user?.lastName,
      course_id: enrollment.courseId,
      course_title: enrollment.course?.title,
      course_level: enrollment.course?.level,
      schedule_id: enrollment.scheduleId,
      start_time: enrollment.schedule?.startTime,
      end_time: enrollment.schedule?.endTime,
      location: enrollment.schedule?.location
    }));

    res.json({
      success: true,
      data: formattedEnrollments,
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

export const getEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        course: {
          select: {
            title: true,
            level: true
          }
        },
        schedule: {
          select: {
            startTime: true,
            endTime: true,
            location: true,
            teacherId: true
          }
        }
      }
    });

    if (!enrollment) {
      throw new AppError('Enrollment not found', 404);
    }

    // Format response
    const formattedEnrollment = {
      ...enrollment,
      email: enrollment.user?.email || '',
      first_name: enrollment.user?.firstName || '',
      last_name: enrollment.user?.lastName || '',
      phone: enrollment.user?.phone || null,
      course_title: enrollment.course?.title || '',
      course_level: enrollment.course?.level || null,
      start_time: enrollment.schedule?.startTime || null,
      end_time: enrollment.schedule?.endTime || null,
      location: enrollment.schedule?.location || null,
      teacher_id: enrollment.schedule?.teacherId || null,
      enrolled_at: enrollment.enrolledAt,
      created_at: enrollment.createdAt,
      updated_at: enrollment.updatedAt
    };
    delete (formattedEnrollment as any).user;
    delete (formattedEnrollment as any).course;
    delete (formattedEnrollment as any).schedule;
    delete (formattedEnrollment as any).enrolledAt;
    delete (formattedEnrollment as any).createdAt;
    delete (formattedEnrollment as any).updatedAt;

    res.json({
      success: true,
      data: formattedEnrollment
    });
  } catch (error) {
    next(error);
  }
};

export const createEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, userEmail, courseId, scheduleId, notes, source } = req.body;

    let finalUserId = userId;

    // If email provided, look up user ID or create new user
    if (userEmail && !userId) {
      let user = await prisma.user.findUnique({
        where: { email: userEmail }
      });

      if (!user) {
        // User doesn't exist, create a new one
        user = await prisma.user.create({
          data: {
            email: userEmail,
            firstName: userEmail.split('@')[0],
            lastName: '',
            roleId: 8, // 'user' role
            status: 'active'
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
      }

      finalUserId = user.id;
    }

    if (!finalUserId || !courseId) {
      throw new AppError('User ID and Course ID are required', 400);
    }

    // Check if already enrolled in this schedule
    if (scheduleId) {
      const existing = await prisma.enrollment.findFirst({
        where: {
          userId: finalUserId,
          scheduleId: scheduleId
        }
      });

      if (existing) {
        throw new AppError('User is already enrolled in this schedule', 409);
      }
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: finalUserId,
        courseId: courseId,
        scheduleId: scheduleId || null,
        notes: notes || null,
        source: source || 'admin',
        status: 'pending'
      }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'enrollment.created',
          resourceType: 'enrollment',
          resourceId: enrollment.id
        }
      });
    }

    // Format response
    const formattedEnrollment = {
      id: enrollment.id,
      user_id: enrollment.userId,
      course_id: enrollment.courseId,
      schedule_id: enrollment.scheduleId,
      status: enrollment.status,
      enrolled_at: enrollment.enrolledAt,
      notes: enrollment.notes,
      source: enrollment.source,
      payment_status: enrollment.paymentStatus,
      created_at: enrollment.createdAt,
      updated_at: enrollment.updatedAt
    };

    res.status(201).json({
      success: true,
      data: formattedEnrollment
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Unique constraint violation (user_id, schedule_id)
      throw new AppError('User is already enrolled in this schedule', 409);
    }
    next(error);
  }
};

export const updateEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes, paymentStatus } = req.body;

    // Build update data
    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (paymentStatus !== undefined) {
      updateData.paymentStatus = paymentStatus;
      
      // Automatically update enrollment status based on payment status
      // Get current enrollment to check existing status
      const currentEnrollment = await prisma.enrollment.findUnique({
        where: { id: parseInt(id) }
      });

      if (currentEnrollment) {
        // If payment status is being changed, update enrollment status accordingly
        if (paymentStatus === 'paid') {
          // When payment is made, approve the enrollment if it's pending
          if (currentEnrollment.status === 'pending') {
            updateData.status = 'approved';
          } else if (currentEnrollment.status === 'cancelled') {
            // If it was cancelled, reactivate it
            updateData.status = 'approved';
          }
          // If already approved/active/completed, keep the current status
        } else if (paymentStatus === 'refunded') {
          // When payment is refunded, cancel the enrollment
          updateData.status = 'cancelled';
        } else if (paymentStatus === 'unpaid') {
          // When payment is unpaid, set to pending if it was approved/active
          if (currentEnrollment.status === 'approved' || currentEnrollment.status === 'active') {
            updateData.status = 'pending';
          }
          // If already pending/cancelled/completed, keep the current status
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const enrollment = await prisma.enrollment.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        course: {
          select: {
            title: true,
            level: true
          }
        },
        schedule: {
          select: {
            startTime: true,
            endTime: true,
            location: true,
            teacherId: true
          }
        }
      }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'enrollment.updated',
          resourceType: 'enrollment',
          resourceId: parseInt(id),
          meta: { changes: req.body }
        }
      });
    }

    // Format response to match getEnrollment format
    const formattedEnrollment = {
      ...enrollment,
      email: enrollment.user?.email || '',
      first_name: enrollment.user?.firstName || '',
      last_name: enrollment.user?.lastName || '',
      phone: enrollment.user?.phone || null,
      course_title: enrollment.course?.title || '',
      course_level: enrollment.course?.level || null,
      start_time: enrollment.schedule?.startTime || null,
      end_time: enrollment.schedule?.endTime || null,
      location: enrollment.schedule?.location || null,
      teacher_id: enrollment.schedule?.teacherId || null,
      user_id: enrollment.userId,
      course_id: enrollment.courseId,
      schedule_id: enrollment.scheduleId,
      enrolled_at: enrollment.enrolledAt,
      created_at: enrollment.createdAt,
      updated_at: enrollment.updatedAt
    };
    delete (formattedEnrollment as any).user;
    delete (formattedEnrollment as any).course;
    delete (formattedEnrollment as any).schedule;
    delete (formattedEnrollment as any).enrolledAt;
    delete (formattedEnrollment as any).createdAt;
    delete (formattedEnrollment as any).updatedAt;
    delete (formattedEnrollment as any).userId;
    delete (formattedEnrollment as any).courseId;
    delete (formattedEnrollment as any).scheduleId;

    res.json({
      success: true,
      data: formattedEnrollment
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma record not found
      throw new AppError('Enrollment not found', 404);
    }
    next(error);
  }
};

export const approveEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.update({
      where: { id: parseInt(id) },
      data: { status: 'approved' }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'enrollment.approved',
          resourceType: 'enrollment',
          resourceId: parseInt(id)
        }
      });
    }

    // TODO: Send email notification to student

    // Format response
    const formattedEnrollment = {
      id: enrollment.id,
      user_id: enrollment.userId,
      course_id: enrollment.courseId,
      schedule_id: enrollment.scheduleId,
      status: enrollment.status,
      enrolled_at: enrollment.enrolledAt,
      notes: enrollment.notes,
      source: enrollment.source,
      payment_status: enrollment.paymentStatus,
      created_at: enrollment.createdAt,
      updated_at: enrollment.updatedAt
    };

    res.json({
      success: true,
      data: formattedEnrollment,
      message: 'Enrollment approved successfully'
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma record not found
      throw new AppError('Enrollment not found', 404);
    }
    next(error);
  }
};

export const rejectEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get current enrollment to append reason to notes
    const currentEnrollment = await prisma.enrollment.findUnique({
      where: { id: parseInt(id) }
    });

    if (!currentEnrollment) {
      throw new AppError('Enrollment not found', 404);
    }

    const updatedNotes = currentEnrollment.notes
      ? `${currentEnrollment.notes}\nRejected: ${reason || 'No reason provided'}`
      : `Rejected: ${reason || 'No reason provided'}`;

    const enrollment = await prisma.enrollment.update({
      where: { id: parseInt(id) },
      data: {
        status: 'cancelled',
        notes: updatedNotes
      }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'enrollment.rejected',
          resourceType: 'enrollment',
          resourceId: parseInt(id),
          meta: { reason }
        }
      });
    }

    // TODO: Send email notification to student

    // Format response
    const formattedEnrollment = {
      id: enrollment.id,
      user_id: enrollment.userId,
      course_id: enrollment.courseId,
      schedule_id: enrollment.scheduleId,
      status: enrollment.status,
      enrolled_at: enrollment.enrolledAt,
      notes: enrollment.notes,
      source: enrollment.source,
      payment_status: enrollment.paymentStatus,
      created_at: enrollment.createdAt,
      updated_at: enrollment.updatedAt
    };

    res.json({
      success: true,
      data: formattedEnrollment,
      message: 'Enrollment rejected'
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma record not found
      throw new AppError('Enrollment not found', 404);
    }
    next(error);
  }
};

export const deleteEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if enrollment exists before deleting
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: parseInt(id) }
    });

    if (!enrollment) {
      throw new AppError('Enrollment not found', 404);
    }

    // Permanently delete enrollment from database
    await prisma.enrollment.delete({
      where: { id: parseInt(id) }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'enrollment.deleted',
          resourceType: 'enrollment',
          resourceId: parseInt(id)
        }
      });
    }

    res.json({
      success: true,
      message: 'Enrollment permanently deleted successfully'
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma record not found
      throw new AppError('Enrollment not found', 404);
    }
    next(error);
  }
};
