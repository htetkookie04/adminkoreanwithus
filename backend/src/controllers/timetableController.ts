import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getTimetable = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, dayOfWeek } = req.query;
    const user = req.user!;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status as string;
    }

    if (dayOfWeek) {
      where.dayOfWeek = dayOfWeek as string;
    }

    // For teachers, only show timetables where they are the assigned teacher
    if (user.roleName === 'teacher') {
      // Get teacher's full name
      const teacherUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      });

      if (teacherUser) {
        // Build teacher full name (handle null values)
        const firstName = teacherUser.firstName || '';
        const lastName = teacherUser.lastName || '';
        const teacherFullName = `${firstName} ${lastName}`.trim() || teacherUser.email;
        // Filter timetables by teacher name
        where.teacherName = teacherFullName;
      } else {
        // If teacher user not found, return empty result
        return res.json({
          success: true,
          data: []
        });
      }
    }
    // Admin and other roles see all timetables (no additional filter)

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
    // Use UTC to avoid timezone conversion issues - append 'Z' to treat as UTC
    const startDate = new Date(`1970-01-01T${startTime}:00Z`);
    const endDate = new Date(`1970-01-01T${endTime}:00Z`);

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

    // Debug logging (remove in production)
    console.log('[Timetable Update] Received request:', {
      id,
      body: req.body,
      startTime,
      endTime,
      startTimeType: typeof startTime,
      endTimeType: typeof endTime
    });

    // Get current entry for validation
    const currentEntry = await prisma.timetable.findUnique({
      where: { id: parseInt(id) }
    });

    if (!currentEntry) {
      throw new AppError('Timetable entry not found', 404);
    }

    console.log('[Timetable Update] Current entry:', {
      currentStartTime: currentEntry.startTime,
      currentEndTime: currentEntry.endTime
    });

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
      // Use UTC methods to extract time consistently
      const startTimeStr = startTime || 
        `${currentEntry.startTime.getUTCHours().toString().padStart(2, '0')}:${currentEntry.startTime.getUTCMinutes().toString().padStart(2, '0')}`;
      const endTimeStr = endTime || 
        `${currentEntry.endTime.getUTCHours().toString().padStart(2, '0')}:${currentEntry.endTime.getUTCMinutes().toString().padStart(2, '0')}`;

      if (!timeRegex.test(startTimeStr) || !timeRegex.test(endTimeStr)) {
        throw new AppError('Invalid time format. Use HH:MM format', 400);
      }

      if (startTimeStr >= endTimeStr) {
        throw new AppError('End time must be after start time', 400);
      }
    }

    // Build update data
    const updateData: any = {};

    if (courseName !== undefined && courseName !== null && courseName !== '') {
      updateData.courseName = courseName;
    }
    if (level !== undefined && level !== null && level !== '') {
      updateData.level = level;
    }
    if (dayOfWeek !== undefined && dayOfWeek !== null && dayOfWeek !== '') {
      updateData.dayOfWeek = dayOfWeek;
    }
    if (startTime !== undefined && startTime !== null && startTime !== '') {
      // Ensure time is in HH:MM format
      const timeStr = String(startTime).trim();
      if (timeStr.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        // Use UTC to avoid timezone conversion issues - append 'Z' to treat as UTC
        updateData.startTime = new Date(`1970-01-01T${timeStr}:00Z`);
      } else {
        throw new AppError('Invalid start time format. Use HH:MM format', 400);
      }
    }
    if (endTime !== undefined && endTime !== null && endTime !== '') {
      // Ensure time is in HH:MM format
      const timeStr = String(endTime).trim();
      if (timeStr.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        // Use UTC to avoid timezone conversion issues - append 'Z' to treat as UTC
        updateData.endTime = new Date(`1970-01-01T${timeStr}:00Z`);
      } else {
        throw new AppError('Invalid end time format. Use HH:MM format', 400);
      }
    }
    if (teacherName !== undefined && teacherName !== null && teacherName !== '') {
      updateData.teacherName = teacherName;
    }
    if (status !== undefined && status !== null && status !== '') {
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    console.log('[Timetable Update] Update data to be saved:', updateData);

    const entry = await prisma.timetable.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    console.log('[Timetable Update] Updated entry:', {
      startTime: entry.startTime,
      endTime: entry.endTime
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

// Update timetable status - for teachers to update their class status
export const updateTimetableStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user!;

    // Validate status
    const validStatuses = ['active', 'cancelled', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      throw new AppError('Invalid status. Must be one of: active, cancelled, completed', 400);
    }

    // Get current entry
    const currentEntry = await prisma.timetable.findUnique({
      where: { id: parseInt(id) }
    });

    if (!currentEntry) {
      throw new AppError('Timetable entry not found', 404);
    }

    // For teachers, verify they own this timetable entry
    if (user.roleName === 'teacher') {
      const teacherUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      });

      if (teacherUser) {
        const firstName = teacherUser.firstName || '';
        const lastName = teacherUser.lastName || '';
        const teacherFullName = `${firstName} ${lastName}`.trim() || teacherUser.email;
        
        // Check if this entry belongs to the teacher
        if (currentEntry.teacherName !== teacherFullName) {
          throw new AppError('You can only update status for your own timetable entries', 403);
        }
      }
    }

    // Update only the status
    const entry = await prisma.timetable.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    // Log activity
    if (user.id) {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'timetable.status_updated',
          resourceType: 'timetable',
          resourceId: parseInt(id),
          meta: { 
            oldStatus: currentEntry.status,
            newStatus: status 
          }
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
      data: formattedEntry,
      message: 'Status updated successfully'
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new AppError('Timetable entry not found', 404);
    }
    next(error);
  }
};