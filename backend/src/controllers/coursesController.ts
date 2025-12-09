import { Response, NextFunction } from 'express';
import { pool } from '../db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// Mock data store for development
export let mockCourses: any[] = [
  {
    id: 1,
    title: 'Korean Beginner Course',
    slug: 'korean-beginner',
    description: 'Learn basic Korean for beginners',
    level: 'Beginner',
    capacity: 20,
    price: 50000,
    currency: 'MMK',
    active: true,
    created_by: 1,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: 2,
    title: 'Korean Intermediate Course',
    slug: 'korean-intermediate',
    description: 'Intermediate level Korean language course',
    level: 'Intermediate',
    capacity: 15,
    price: 75000,
    currency: 'MMK',
    active: true,
    created_by: 1,
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15')
  }
];
let mockCourseIdCounter = 3;

export let mockSchedules: any[] = [
  {
    id: 1,
    course_id: 1, // Korean Beginner Course
    teacher_id: 2,
    start_time: '2025-12-15T09:00:00',
    end_time: '2026-01-15T11:00:00',
    timezone: 'Asia/Yangon',
    capacity: 20,
    location: 'Online - Zoom',
    status: 'scheduled',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 2,
    course_id: 2, // Korean Intermediate Course
    teacher_id: 2,
    start_time: '2025-12-09T10:40:00',
    end_time: '2025-12-31T10:40:00',
    timezone: 'Asia/Yangon',
    capacity: 2,
    location: 'Zoom link, classroom address, or TBA',
    status: 'scheduled',
    created_at: new Date(),
    updated_at: new Date()
  }
];
let mockScheduleIdCounter = 3;

export const getCourses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      q,
      level,
      active,
      page = '1',
      per_page = '20'
    } = req.query;

    const limit = parseInt(per_page as string);
    const offset = (parseInt(page as string) - 1) * limit;

    if (process.env.MOCK_MODE === 'true') {
      // Mock mode filtering
      let filtered = [...mockCourses];

      if (q) {
        const searchLower = (q as string).toLowerCase();
        filtered = filtered.filter(c => 
          c.title.toLowerCase().includes(searchLower) ||
          c.description?.toLowerCase().includes(searchLower)
        );
      }

      if (level) {
        filtered = filtered.filter(c => c.level === level);
      }

      if (active !== undefined) {
        filtered = filtered.filter(c => c.active === (active === 'true'));
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
      let query = `
        SELECT c.id, c.title, c.slug, c.description, c.level, 
               c.capacity, c.price, c.currency, c.active, 
               c.created_at, c.updated_at
        FROM courses c
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (q) {
        paramCount++;
        query += ` AND (c.title ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`;
        params.push(`%${q}%`);
      }

      if (level) {
        paramCount++;
        query += ` AND c.level = $${paramCount}`;
        params.push(level);
      }

      if (active !== undefined) {
        paramCount++;
        query += ` AND c.active = $${paramCount}`;
        params.push(active === 'true');
      }

      // Count total
      const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add pagination
      paramCount++;
      query += ` ORDER BY c.created_at DESC LIMIT $${paramCount}`;
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

export const getCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (process.env.MOCK_MODE === 'true') {
      const course = mockCourses.find(c => c.id === parseInt(id));
      
      if (!course) {
        throw new AppError('Course not found', 404);
      }

      res.json({
        success: true,
        data: course
      });
    } else {
      const result = await pool.query(
        `SELECT c.*, u.first_name || ' ' || u.last_name as created_by_name
         FROM courses c
         LEFT JOIN users u ON c.created_by = u.id
         WHERE c.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Course not found', 404);
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

export const createCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, slug, description, level, capacity, price, currency, active } = req.body;

    if (!title || !slug) {
      throw new AppError('Title and slug are required', 400);
    }

    if (process.env.MOCK_MODE === 'true') {
      // Check if slug exists in mock data
      const existing = mockCourses.find(c => c.slug === slug);
      if (existing) {
        throw new AppError('Slug already exists', 409);
      }

      const newCourse = {
        id: mockCourseIdCounter++,
        title,
        slug,
        description: description || null,
        level: level || null,
        capacity: capacity || 0,
        price: price || 0,
        currency: currency || 'MMK',
        active: active !== false,
        created_by: req.user?.id,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockCourses.push(newCourse);

      console.log('\n📚 MOCK MODE - Course Created:');
      console.log(`   Title: ${title}`);
      console.log(`   Slug: ${slug}`);
      console.log(`   Level: ${level || 'Not specified'}`);
      console.log(`   Price: ${price || 0} ${currency || 'MMK'}\n`);

      res.status(201).json({
        success: true,
        data: newCourse
      });
    } else {
      // Check if slug exists
      const existing = await pool.query('SELECT id FROM courses WHERE slug = $1', [slug]);
      if (existing.rows.length > 0) {
        throw new AppError('Slug already exists', 409);
      }

      const result = await pool.query(
        `INSERT INTO courses (title, slug, description, level, capacity, price, currency, active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [title, slug, description, level, capacity || 0, price || 0, currency || 'MMK', active !== false, req.user?.id]
      );

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
         VALUES ($1, 'course.created', 'course', $2)`,
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

export const updateCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, slug, description, level, capacity, price, currency, active } = req.body;

    if (process.env.MOCK_MODE === 'true') {
      const courseIndex = mockCourses.findIndex(c => c.id === parseInt(id));
      
      if (courseIndex === -1) {
        throw new AppError('Course not found', 404);
      }

      // Check slug uniqueness if changing
      if (slug && slug !== mockCourses[courseIndex].slug) {
        const existing = mockCourses.find(c => c.slug === slug && c.id !== parseInt(id));
        if (existing) {
          throw new AppError('Slug already exists', 409);
        }
      }

      const course = mockCourses[courseIndex];
      
      if (title !== undefined) course.title = title;
      if (slug !== undefined) course.slug = slug;
      if (description !== undefined) course.description = description;
      if (level !== undefined) course.level = level;
      if (capacity !== undefined) course.capacity = capacity;
      if (price !== undefined) course.price = price;
      if (currency !== undefined) course.currency = currency;
      if (active !== undefined) course.active = active;
      course.updated_at = new Date();

      console.log('\n📝 MOCK MODE - Course Updated:');
      console.log(`   ID: ${id}`);
      console.log(`   Title: ${course.title}`);
      console.log(`   Slug: ${course.slug}\n`);

      res.json({
        success: true,
        data: course
      });
    } else {
      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (title !== undefined) {
        paramCount++;
        updates.push(`title = $${paramCount}`);
        params.push(title);
      }
      if (slug !== undefined) {
        // Check slug uniqueness if changing
        const existing = await pool.query('SELECT id FROM courses WHERE slug = $1 AND id != $2', [slug, id]);
        if (existing.rows.length > 0) {
          throw new AppError('Slug already exists', 409);
        }
        paramCount++;
        updates.push(`slug = $${paramCount}`);
        params.push(slug);
      }
      if (description !== undefined) {
        paramCount++;
        updates.push(`description = $${paramCount}`);
        params.push(description);
      }
      if (level !== undefined) {
        paramCount++;
        updates.push(`level = $${paramCount}`);
        params.push(level);
      }
      if (capacity !== undefined) {
        paramCount++;
        updates.push(`capacity = $${paramCount}`);
        params.push(capacity);
      }
      if (price !== undefined) {
        paramCount++;
        updates.push(`price = $${paramCount}`);
        params.push(price);
      }
      if (currency !== undefined) {
        paramCount++;
        updates.push(`currency = $${paramCount}`);
        params.push(currency);
      }
      if (active !== undefined) {
        paramCount++;
        updates.push(`active = $${paramCount}`);
        params.push(active);
      }

      if (updates.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      paramCount++;
      params.push(id);

      const result = await pool.query(
        `UPDATE courses SET ${updates.join(', ')}, updated_at = now() WHERE id = $${paramCount}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new AppError('Course not found', 404);
      }

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, meta)
         VALUES ($1, 'course.updated', 'course', $2, $3)`,
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

export const deleteCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Soft delete (set active to false)
    const result = await pool.query(
      `UPDATE courses SET active = false, updated_at = now() WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Course not found', 404);
    }

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
       VALUES ($1, 'course.deleted', 'course', $2)`,
      [req.user?.id, id]
    );

    res.json({
      success: true,
      message: 'Course archived successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseSchedules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (process.env.MOCK_MODE === 'true') {
      const schedules = mockSchedules.filter(s => s.course_id === parseInt(id));
      
      res.json({
        success: true,
        data: schedules
      });
    } else {
      const result = await pool.query(
        `SELECT s.*, u.first_name || ' ' || u.last_name as teacher_name
         FROM schedules s
         LEFT JOIN users u ON s.teacher_id = u.id
         WHERE s.course_id = $1
         ORDER BY s.start_time ASC`,
        [id]
      );

      res.json({
        success: true,
        data: result.rows
      });
    }
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

    if (process.env.MOCK_MODE === 'true') {
      const newSchedule = {
        id: mockScheduleIdCounter++,
        course_id: parseInt(id),
        teacher_id: teacherId || null,
        start_time: startTime,
        end_time: endTime,
        timezone: timezone || 'Asia/Yangon',
        capacity: capacity || null,
        location: location || null,
        status: status || 'scheduled',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockSchedules.push(newSchedule);

      console.log('\n📅 MOCK MODE - Schedule Created:');
      console.log(`   Course ID: ${id}`);
      console.log(`   Start: ${startTime}`);
      console.log(`   End: ${endTime}`);
      console.log(`   Location: ${location || 'Not specified'}\n`);

      res.status(201).json({
        success: true,
        data: newSchedule
      });
    } else {
      const result = await pool.query(
        `INSERT INTO schedules (course_id, teacher_id, start_time, end_time, timezone, capacity, location, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, teacherId, startTime, endTime, timezone || 'Asia/Yangon', capacity, location, status || 'scheduled']
      );

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
         VALUES ($1, 'schedule.created', 'schedule', $2)`,
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

