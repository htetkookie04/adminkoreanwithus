import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getTimetable = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, dayOfWeek } = req.query;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status as string;
    }

    if (dayOfWeek) {
      where.dayOfWeek = dayOfWeek as string;
    }

    // Get timetable entries
    const entries = await prisma.timetable.findMany({
      where,
      orderBy: [
        {
          dayOfWeek: 'asc'
        },
        {
          startTime: 'asc'
        }
      ]
    });

    // Sort by day order (custom order)
    const dayOrder: Record<string, number> = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 7
    };

    const sortedEntries = entries.sort((a, b) => {
      const dayDiff = (dayOrder[a.dayOfWeek] || 99) - (dayOrder[b.dayOfWeek] || 99);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.getTime() - b.startTime.getTime();
    });

    // Format response
    const formattedEntries = sortedEntries.map(entry => ({
      id: entry.id,
      course_name: entry.courseName,
      level: entry.level,
      day_of_week: entry.dayOfWeek,
      start_time: entry.startTime,
      end_time: entry.endTime,
      teacher_name: entry.teacherName,
      status: entry.status,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt
    }));

    res.json({
      success: true,
      data: formattedEntries
    });
  } catch (error) {
    next(error);
  }
};

export const getTimetableEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const entry = await prisma.timetable.findUnique({
      where: { id: parseInt(id) }
    });

    if (!entry) {
      throw new AppError('Timetable entry not found', 404);
    }

    // Format response
    const formattedEntry = {
      id: entry.id,
      course_name: entry.courseName,
      level: entry.level,
      day_of_week: entry.dayOfWeek,
      start_time: entry.startTime,
      end_time: entry.endTime,
      teacher_name: entry.teacherName,
      status: entry.status,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt
    };

    res.json({
      success: true,
      data: formattedEntry
    });
  } catch (error) {
    next(error);
  }
};

export const createTimetableEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseName, level, dayOfWeek, startTime, endTime, teacherName, status } = req.body;

    if (!courseName || !level || !dayOfWeek || !startTime || !endTime || !teacherName) {
      throw new AppError('All required fields must be provided', 400);
    }

    // Validate day of week
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(dayOfWeek)) {
      throw new AppError('Invalid day of week', 400);
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      throw new AppError('Invalid time format. Use HH:MM format', 400);
    }

    // Validate end time is after start time
    if (startTime >= endTime) {
      throw new AppError('End time must be after start time', 400);
    }

    // Convert time strings to Date objects (using a fixed date for TIME type)
    const startDate = new Date(`1970-01-01T${startTime}:00`);
    const endDate = new Date(`1970-01-01T${endTime}:00`);

    const entry = await prisma.timetable.create({
      data: {
        courseName,
        level,
        dayOfWeek,
        startTime: startDate,
        endTime: endDate,
        teacherName,
        status: status || 'active'
      }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'timetable.created',
          resourceType: 'timetable',
          resourceId: entry.id
        }
      });
    }

    // Format response
    const formattedEntry = {
      id: entry.id,
      course_name: entry.courseName,
      level: entry.level,
      day_of_week: entry.dayOfWeek,
      start_time: entry.startTime,
      end_time: entry.endTime,
      teacher_name: entry.teacherName,
      status: entry.status,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt
    };

    res.status(201).json({
      success: true,
      data: formattedEntry
    });
  } catch (error) {
    next(error);
  }
};

export const updateTimetableEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { courseName, level, dayOfWeek, startTime, endTime, teacherName, status } = req.body;

    // Get current entry for validation
    const currentEntry = await prisma.timetable.findUnique({
      where: { id: parseInt(id) }
    });

    if (!currentEntry) {
      throw new AppError('Timetable entry not found', 404);
    }

    // Validate day of week if changing
    if (dayOfWeek !== undefined) {
      const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      if (!validDays.includes(dayOfWeek)) {
        throw new AppError('Invalid day of week', 400);
      }
    }

    // Validate time format if changing
    const finalStartTime = startTime !== undefined ? startTime : currentEntry.startTime;
    const finalEndTime = endTime !== undefined ? endTime : currentEntry.endTime;

    if (startTime !== undefined || endTime !== undefined) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      const startTimeStr = startTime || currentEntry.startTime.toTimeString().slice(0, 5);
      const endTimeStr = endTime || currentEntry.endTime.toTimeString().slice(0, 5);

      if (!timeRegex.test(startTimeStr) || !timeRegex.test(endTimeStr)) {
        throw new AppError('Invalid time format. Use HH:MM format', 400);
      }

      if (startTimeStr >= endTimeStr) {
        throw new AppError('End time must be after start time', 400);
      }
    }

    // Build update data
    const updateData: any = {};

    if (courseName !== undefined) updateData.courseName = courseName;
    if (level !== undefined) updateData.level = level;
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;
    if (startTime !== undefined) {
      updateData.startTime = new Date(`1970-01-01T${startTime}:00`);
    }
    if (endTime !== undefined) {
      updateData.endTime = new Date(`1970-01-01T${endTime}:00`);
    }
    if (teacherName !== undefined) updateData.teacherName = teacherName;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const entry = await prisma.timetable.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'timetable.updated',
          resourceType: 'timetable',
          resourceId: parseInt(id),
          meta: { changes: req.body }
        }
      });
    }

    // Format response
    const formattedEntry = {
      id: entry.id,
      course_name: entry.courseName,
      level: entry.level,
      day_of_week: entry.dayOfWeek,
      start_time: entry.startTime,
      end_time: entry.endTime,
      teacher_name: entry.teacherName,
      status: entry.status,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt
    };

    res.json({
      success: true,
      data: formattedEntry
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma record not found
      throw new AppError('Timetable entry not found', 404);
    }
    next(error);
  }
};

export const deleteTimetableEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.timetable.delete({
      where: { id: parseInt(id) }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'timetable.deleted',
          resourceType: 'timetable',
          resourceId: parseInt(id)
        }
      });
    }

    res.json({
      success: true,
      message: 'Timetable entry deleted successfully'
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma record not found
      throw new AppError('Timetable entry not found', 404);
    }
    next(error);
  }
};
