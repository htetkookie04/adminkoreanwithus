import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getCourses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      q,
      level,
      active,
      page = '1',
      per_page = '20'
    } = req.query;

    const user = req.user!;
    const limit = parseInt(per_page as string);
    const skip = (parseInt(page as string) - 1) * limit;

    // Build where clause
    const where: any = {};

    if (q) {
      where.OR = [
        { title: { contains: q as string, mode: 'insensitive' } },
        { description: { contains: q as string, mode: 'insensitive' } }
      ];
    }

    if (level) {
      where.level = level as string;
    }

    if (active !== undefined) {
      where.active = active === 'true';
    }

    // For users/students/viewers, only show courses they are enrolled in
    if (user.roleName === 'user' || user.roleName === 'student' || user.roleName === 'viewer') {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          userId: user.id,
          status: { in: ['approved', 'active'] }
        },
        select: {
          courseId: true
        }
      });

      const enrolledCourseIds = enrollments.map(e => e.courseId).filter(Boolean) as number[];
      
      if (enrolledCourseIds.length === 0) {
        // No enrolled courses, return empty result
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page as string),
            per_page: limit,
            total: 0,
            total_pages: 0
          }
        });
      }

      where.id = { in: enrolledCourseIds };
    }
    // For teachers, only show courses that have schedules assigned to them
    else if (user.roleName === 'teacher') {
      const schedules = await prisma.schedule.findMany({
        where: {
          teacherId: user.id
        },
        select: {
          courseId: true
        }
      });

      const courseIds = schedules.map(s => s.courseId).filter(Boolean) as number[];
      
      if (courseIds.length === 0) {
        // No courses assigned, return empty result
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page as string),
            per_page: limit,
            total: 0,
            total_pages: 0
          }
        });
      }

      where.id = { in: courseIds };
    }
    // Admin and other roles see all courses (no additional filter)

    // Get courses
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.course.count({ where })
    ]);

    // Format response
    const formattedCourses = courses.map(course => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      level: course.level,
      capacity: course.capacity,
      price: course.price,
      currency: course.currency,
      active: course.active,
      created_at: course.createdAt,
      updated_at: course.updatedAt
    }));

    res.json({
      success: true,
      data: formattedCourses,
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

export const getCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Validate course ID
    const courseId = parseInt(id);
    if (isNaN(courseId) || courseId <= 0) {
      throw new AppError('Invalid course ID', 400);
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // For users/students/viewers, check if they are enrolled in this course
    if (user.roleName === 'user' || user.roleName === 'student' || user.roleName === 'viewer') {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: user.id,
          courseId: courseId,
          status: { in: ['approved', 'active'] }
        }
      });

      if (!enrollment) {
        throw new AppError('Access denied. You are not enrolled in this course.', 403);
      }
    }

    // Format response
    const formattedCourse = {
      ...course,
      created_by_name: course.creator 
        ? `${course.creator.firstName} ${course.creator.lastName}` 
        : null,
      created_at: course.createdAt,
      updated_at: course.updatedAt
    };
    delete (formattedCourse as any).creator;
    delete (formattedCourse as any).createdAt;
    delete (formattedCourse as any).updatedAt;

    res.json({
      success: true,
      data: formattedCourse
    });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, slug, description, level, capacity, price, currency, active } = req.body;

    if (!title || !slug) {
      throw new AppError('Title and slug are required', 400);
    }

    // Check if slug exists
    const existing = await prisma.course.findUnique({
      where: { slug }
    });

    if (existing) {
      throw new AppError('Slug already exists', 409);
    }

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description,
        level,
        capacity: capacity || 0,
        price: price || 0,
        currency: 'MMK', // Always MMK
        active: active !== false,
        createdBy: req.user?.id
      }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'course.created',
          resourceType: 'course',
          resourceId: course.id
        }
      });
    }

    // Format response
    const formattedCourse = {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      level: course.level,
      capacity: course.capacity,
      price: course.price,
      currency: course.currency,
      active: course.active,
      created_by: course.createdBy,
      created_at: course.createdAt,
      updated_at: course.updatedAt
    };

    res.status(201).json({
      success: true,
      data: formattedCourse
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      throw new AppError('Slug already exists', 409);
    }
    next(error);
  }
};

export const updateCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, slug, description, level, capacity, price, currency, active } = req.body;

    // Check slug uniqueness if changing
    if (slug) {
      const existing = await prisma.course.findFirst({
        where: {
          slug,
          id: { not: parseInt(id) }
        }
      });

      if (existing) {
        throw new AppError('Slug already exists', 409);
      }
    }

    // Build update data
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (level !== undefined) updateData.level = level;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (price !== undefined) updateData.price = price;
    // Currency is always MMK - ignore any currency updates
    if (active !== undefined) updateData.active = active;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const course = await prisma.course.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'course.updated',
          resourceType: 'course',
          resourceId: parseInt(id),
          meta: { changes: req.body }
        }
      });
    }

    // Format response
    const formattedCourse = {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      level: course.level,
      capacity: course.capacity,
      price: course.price,
      currency: course.currency,
      active: course.active,
      created_by: course.createdBy,
      created_at: course.createdAt,
      updated_at: course.updatedAt
    };

    res.json({
      success: true,
      data: formattedCourse
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma record not found
      throw new AppError('Course not found', 404);
    }
    if (error.code === 'P2002') {
      // Unique constraint violation
      throw new AppError('Slug already exists', 409);
    }
    next(error);
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Soft delete (set active to false)
    const course = await prisma.course.update({
      where: { id: parseInt(id) },
      data: { active: false }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'course.deleted',
          resourceType: 'course',
          resourceId: parseInt(id)
        }
      });
    }

    res.json({
      success: true,
      message: 'Course archived successfully'
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma record not found
      throw new AppError('Course not found', 404);
    }
    next(error);
  }
};

export const getCourseSchedules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const schedules = await prisma.schedule.findMany({
      where: {
        courseId: parseInt(id)
      },
      include: {
        teacher: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Format response
    const formattedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      course_id: schedule.courseId,
      teacher_id: schedule.teacherId,
      teacher_name: schedule.teacher 
        ? `${schedule.teacher.firstName} ${schedule.teacher.lastName}` 
        : null,
      start_time: schedule.startTime,
      end_time: schedule.endTime,
      timezone: schedule.timezone,
      capacity: schedule.capacity,
      location: schedule.location,
      status: schedule.status,
      created_at: schedule.createdAt,
      updated_at: schedule.updatedAt
    }));

    res.json({
      success: true,
      data: formattedSchedules
    });
  } catch (error) {
    next(error);
  }
};

export const createSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { teacherId, startTime, endTime, timezone, capacity, location, status } = req.body;

    if (!startTime || !endTime) {
      throw new AppError('Start time and end time are required', 400);
    }

    const schedule = await prisma.schedule.create({
      data: {
        courseId: parseInt(id),
        teacherId: teacherId || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        timezone: timezone || 'Asia/Yangon',
        capacity: capacity || null,
        location: location || null,
        status: status || 'scheduled'
      }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'schedule.created',
          resourceType: 'schedule',
          resourceId: schedule.id
        }
      });
    }

    // Format response
    const formattedSchedule = {
      id: schedule.id,
      course_id: schedule.courseId,
      teacher_id: schedule.teacherId,
      start_time: schedule.startTime,
      end_time: schedule.endTime,
      timezone: schedule.timezone,
      capacity: schedule.capacity,
      location: schedule.location,
      status: schedule.status,
      created_at: schedule.createdAt,
      updated_at: schedule.updatedAt
    };

    res.status(201).json({
      success: true,
      data: formattedSchedule
    });
  } catch (error) {
    next(error);
  }
};

// PUT /courses/:id/schedules/:scheduleId - Update schedule
export const updateSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, scheduleId } = req.params;
    const { teacherId, startTime, endTime, timezone, capacity, location, status } = req.body;

    // Check if schedule exists
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id: parseInt(scheduleId) }
    });

    if (!existingSchedule) {
      throw new AppError('Schedule not found', 404);
    }

    // Verify schedule belongs to the course
    if (existingSchedule.courseId !== parseInt(id)) {
      throw new AppError('Schedule does not belong to this course', 400);
    }

    // Validate dates if provided
    if (startTime && endTime) {
      if (new Date(endTime) <= new Date(startTime)) {
        throw new AppError('End time must be after start time', 400);
      }
    }

    // Update schedule
    const schedule = await prisma.schedule.update({
      where: { id: parseInt(scheduleId) },
      data: {
        teacherId: teacherId !== undefined ? (teacherId || null) : undefined,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        timezone: timezone || undefined,
        capacity: capacity !== undefined ? (capacity || null) : undefined,
        location: location !== undefined ? (location || null) : undefined,
        status: status || undefined
      }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'schedule.updated',
          resourceType: 'schedule',
          resourceId: schedule.id
        }
      });
    }

    // Format response
    const formattedSchedule = {
      id: schedule.id,
      course_id: schedule.courseId,
      teacher_id: schedule.teacherId,
      start_time: schedule.startTime,
      end_time: schedule.endTime,
      timezone: schedule.timezone,
      capacity: schedule.capacity,
      location: schedule.location,
      status: schedule.status,
      created_at: schedule.createdAt,
      updated_at: schedule.updatedAt
    };

    res.json({
      success: true,
      data: formattedSchedule
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /courses/:id/schedules/:scheduleId - Delete schedule
export const deleteSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, scheduleId } = req.params;

    // Check if schedule exists
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id: parseInt(scheduleId) }
    });

    if (!existingSchedule) {
      throw new AppError('Schedule not found', 404);
    }

    // Verify schedule belongs to the course
    if (existingSchedule.courseId !== parseInt(id)) {
      throw new AppError('Schedule does not belong to this course', 400);
    }

    // Delete schedule
    await prisma.schedule.delete({
      where: { id: parseInt(scheduleId) }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'schedule.deleted',
          resourceType: 'schedule',
          resourceId: parseInt(scheduleId)
        }
      });
    }

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// GET /courses/with-lectures - Get courses with lecture counts and teacher info
export const getCoursesWithLectures = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    
    // Build where clause
    const where: any = {
      active: true
    };

    // For users/students/viewers, only show courses they are enrolled in
    if (user.roleName === 'user' || user.roleName === 'student' || user.roleName === 'viewer') {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          userId: user.id,
          status: { in: ['approved', 'active'] }
        },
        select: {
          courseId: true
        }
      });

      const enrolledCourseIds = enrollments.map(e => e.courseId).filter(Boolean) as number[];
      
      if (enrolledCourseIds.length === 0) {
        // No enrolled courses, return empty result
        return res.json({
          success: true,
          data: []
        });
      }

      where.id = { in: enrolledCourseIds };
    }
    // For teachers, only show courses that have schedules assigned to them
    else if (user.roleName === 'teacher') {
      const schedules = await prisma.schedule.findMany({
        where: {
          teacherId: user.id
        },
        select: {
          courseId: true
        }
      });

      const courseIds = schedules.map(s => s.courseId).filter(Boolean) as number[];
      
      if (courseIds.length === 0) {
        // No courses assigned, return empty result
        return res.json({
          success: true,
          data: []
        });
      }

      where.id = { in: courseIds };
    }
    // Admin and other roles see all courses (no additional filter)

    const courses = await prisma.course.findMany({
      where,
      include: {
        lectures: {
          select: {
            id: true
          }
        },
        schedules: {
          where: {
            teacherId: { not: null }
          },
          include: {
            teacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format response
    const formattedCourses = courses.map(course => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      level: course.level,
      capacity: course.capacity,
      price: course.price,
      currency: course.currency,
      active: course.active,
      created_at: course.createdAt,
      lecture_count: course.lectures.length,
      teacher_name: course.schedules[0]?.teacher
        ? `${course.schedules[0].teacher.firstName} ${course.schedules[0].teacher.lastName}`
        : null
    }));

    res.json({
      success: true,
      data: formattedCourses
    });
  } catch (error) {
    next(error);
  }
};
