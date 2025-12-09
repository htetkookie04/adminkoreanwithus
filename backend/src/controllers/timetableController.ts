import { Response, NextFunction } from 'express';
import { pool } from '../db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// Mock data store for development
export let mockTimetable: any[] = [];
let mockTimetableIdCounter = 1;

export const getTimetable = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, dayOfWeek } = req.query;

    if (process.env.MOCK_MODE === 'true') {
      let filtered = [...mockTimetable];

      if (status) {
        filtered = filtered.filter(t => t.status === status);
      }

      if (dayOfWeek) {
        filtered = filtered.filter(t => t.day_of_week === dayOfWeek);
      }

      // Sort by day_of_week and start_time
      const dayOrder: Record<string, number> = {
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6,
        'Sunday': 7
      };

      filtered.sort((a, b) => {
        const dayDiff = (dayOrder[a.day_of_week] || 99) - (dayOrder[b.day_of_week] || 99);
        if (dayDiff !== 0) return dayDiff;
        return a.start_time.localeCompare(b.start_time);
      });

      res.json({
        success: true,
        data: filtered
      });
    } else {
      let query = `
        SELECT id, course_name, level, day_of_week, start_time, end_time, teacher_name, status, created_at, updated_at
        FROM timetable
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (dayOfWeek) {
        paramCount++;
        query += ` AND day_of_week = $${paramCount}`;
        params.push(dayOfWeek);
      }

      // Sort by day_of_week and start_time
      query += ` ORDER BY 
        CASE day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
        END,
        start_time ASC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getTimetableEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (process.env.MOCK_MODE === 'true') {
      const entry = mockTimetable.find(t => t.id === parseInt(id));
      
      if (!entry) {
        throw new AppError('Timetable entry not found', 404);
      }

      res.json({
        success: true,
        data: entry
      });
    } else {
      const result = await pool.query(
        'SELECT * FROM timetable WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Timetable entry not found', 404);
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

    if (process.env.MOCK_MODE === 'true') {
      const newEntry = {
        id: mockTimetableIdCounter++,
        course_name: courseName,
        level,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        teacher_name: teacherName,
        status: status || 'active',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockTimetable.push(newEntry);

      console.log('\n📅 MOCK MODE - Timetable Entry Created:');
      console.log(`   Course: ${courseName}`);
      console.log(`   Level: ${level}`);
      console.log(`   Day: ${dayOfWeek}`);
      console.log(`   Time: ${startTime} - ${endTime}`);
      console.log(`   Teacher: ${teacherName}\n`);

      res.status(201).json({
        success: true,
        data: newEntry
      });
    } else {
      const result = await pool.query(
        `INSERT INTO timetable (course_name, level, day_of_week, start_time, end_time, teacher_name, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [courseName, level, dayOfWeek, startTime, endTime, teacherName, status || 'active']
      );

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
         VALUES ($1, 'timetable.created', 'timetable', $2)`,
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

export const updateTimetableEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { courseName, level, dayOfWeek, startTime, endTime, teacherName, status } = req.body;

    if (process.env.MOCK_MODE === 'true') {
      const entryIndex = mockTimetable.findIndex(t => t.id === parseInt(id));
      
      if (entryIndex === -1) {
        throw new AppError('Timetable entry not found', 404);
      }

      const entry = mockTimetable[entryIndex];

      // Validate day of week if changing
      if (dayOfWeek !== undefined) {
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        if (!validDays.includes(dayOfWeek)) {
          throw new AppError('Invalid day of week', 400);
        }
      }

      // Validate time format if changing
      if (startTime !== undefined || endTime !== undefined) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        const finalStartTime = startTime !== undefined ? startTime : entry.start_time;
        const finalEndTime = endTime !== undefined ? endTime : entry.end_time;
        
        if (!timeRegex.test(finalStartTime) || !timeRegex.test(finalEndTime)) {
          throw new AppError('Invalid time format. Use HH:MM format', 400);
        }
        
        if (finalStartTime >= finalEndTime) {
          throw new AppError('End time must be after start time', 400);
        }
      }

      // Update fields
      if (courseName !== undefined) entry.course_name = courseName;
      if (level !== undefined) entry.level = level;
      if (dayOfWeek !== undefined) entry.day_of_week = dayOfWeek;
      if (startTime !== undefined) entry.start_time = startTime;
      if (endTime !== undefined) entry.end_time = endTime;
      if (teacherName !== undefined) entry.teacher_name = teacherName;
      if (status !== undefined) entry.status = status;
      entry.updated_at = new Date();

      console.log('\n📝 MOCK MODE - Timetable Entry Updated:');
      console.log(`   ID: ${id}`);
      console.log(`   Course: ${entry.course_name}`);
      console.log(`   Day: ${entry.day_of_week}\n`);

      res.json({
        success: true,
        data: entry
      });
    } else {
      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (courseName !== undefined) {
        paramCount++;
        updates.push(`course_name = $${paramCount}`);
        params.push(courseName);
      }
      if (level !== undefined) {
        paramCount++;
        updates.push(`level = $${paramCount}`);
        params.push(level);
      }
      if (dayOfWeek !== undefined) {
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        if (!validDays.includes(dayOfWeek)) {
          throw new AppError('Invalid day of week', 400);
        }
        paramCount++;
        updates.push(`day_of_week = $${paramCount}`);
        params.push(dayOfWeek);
      }
      if (startTime !== undefined) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime)) {
          throw new AppError('Invalid time format. Use HH:MM format', 400);
        }
        paramCount++;
        updates.push(`start_time = $${paramCount}`);
        params.push(startTime);
      }
      if (endTime !== undefined) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(endTime)) {
          throw new AppError('Invalid time format. Use HH:MM format', 400);
        }
        paramCount++;
        updates.push(`end_time = $${paramCount}`);
        params.push(endTime);
      }
      if (teacherName !== undefined) {
        paramCount++;
        updates.push(`teacher_name = $${paramCount}`);
        params.push(teacherName);
      }
      if (status !== undefined) {
        paramCount++;
        updates.push(`status = $${paramCount}`);
        params.push(status);
      }

      if (updates.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      // Validate time order if both times are being updated
      if (startTime !== undefined && endTime !== undefined && startTime >= endTime) {
        throw new AppError('End time must be after start time', 400);
      }

      paramCount++;
      params.push(id);

      const result = await pool.query(
        `UPDATE timetable SET ${updates.join(', ')}, updated_at = now() WHERE id = $${paramCount}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new AppError('Timetable entry not found', 404);
      }

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, meta)
         VALUES ($1, 'timetable.updated', 'timetable', $2, $3)`,
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

export const deleteTimetableEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (process.env.MOCK_MODE === 'true') {
      const entryIndex = mockTimetable.findIndex(t => t.id === parseInt(id));
      
      if (entryIndex === -1) {
        throw new AppError('Timetable entry not found', 404);
      }

      const deletedEntry = mockTimetable.splice(entryIndex, 1)[0];

      console.log('\n🗑️  MOCK MODE - Timetable Entry Deleted:');
      console.log(`   ID: ${id}`);
      console.log(`   Course: ${deletedEntry.course_name}\n`);

      res.json({
        success: true,
        message: 'Timetable entry deleted successfully'
      });
    } else {
      const result = await pool.query(
        'DELETE FROM timetable WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Timetable entry not found', 404);
      }

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
         VALUES ($1, 'timetable.deleted', 'timetable', $2)`,
        [req.user?.id, id]
      );

      res.json({
        success: true,
        message: 'Timetable entry deleted successfully'
      });
    }
  } catch (error) {
    next(error);
  }
};

