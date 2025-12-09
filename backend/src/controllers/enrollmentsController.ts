import { Response, NextFunction } from 'express';
import { pool } from '../db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { mockUsers } from './usersController';

// Import mockUserIdCounter - we'll need to access it
// Since it's not exported, we'll manage our own counter or get the max ID
const getNextMockUserId = () => {
  return Math.max(...mockUsers.map(u => u.id), 0) + 1;
};
import { mockCourses } from './coursesController';
import { mockSchedules } from './coursesController';

// Mock data store for development
export let mockEnrollments: any[] = [];
let mockEnrollmentIdCounter = 1;

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
    const offset = (parseInt(page as string) - 1) * limit;

    if (process.env.MOCK_MODE === 'true') {
      // Mock mode - filter in memory
      let filteredEnrollments = [...mockEnrollments];

      if (courseId) {
        filteredEnrollments = filteredEnrollments.filter(e => e.course_id === parseInt(courseId as string));
      }
      if (userId) {
        filteredEnrollments = filteredEnrollments.filter(e => e.user_id === parseInt(userId as string));
      }
      if (status) {
        filteredEnrollments = filteredEnrollments.filter(e => e.status === status);
      }
      if (paymentStatus) {
        filteredEnrollments = filteredEnrollments.filter(e => e.payment_status === paymentStatus);
      }

      // Enrich with user and course data
      const enrichedEnrollments = filteredEnrollments.map(enrollment => {
        const user = mockUsers.find(u => u.id === enrollment.user_id);
        const course = mockCourses.find(c => c.id === enrollment.course_id);
        const schedule = enrollment.schedule_id ? mockSchedules.find(s => s.id === enrollment.schedule_id) : null;

        return {
          ...enrollment,
          email: user?.email,
          first_name: user?.first_name,
          last_name: user?.last_name,
          course_title: course?.title,
          course_level: course?.level,
          start_time: schedule?.start_time,
          end_time: schedule?.end_time,
          location: schedule?.location
        };
      });

      const total = enrichedEnrollments.length;
      const paginatedData = enrichedEnrollments.slice(offset, offset + limit);

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
      // Database mode
      let query = `
        SELECT e.id, e.status, e.enrolled_at, e.notes, e.source, e.payment_status,
               e.created_at, e.updated_at,
               u.id as user_id, u.email, u.first_name, u.last_name,
               c.id as course_id, c.title as course_title, c.level as course_level,
               s.id as schedule_id, s.start_time, s.end_time, s.location
        FROM enrollments e
        LEFT JOIN users u ON e.user_id = u.id
        LEFT JOIN courses c ON e.course_id = c.id
        LEFT JOIN schedules s ON e.schedule_id = s.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (courseId) {
        paramCount++;
        query += ` AND e.course_id = $${paramCount}`;
        params.push(courseId);
      }

      if (userId) {
        paramCount++;
        query += ` AND e.user_id = $${paramCount}`;
        params.push(userId);
      }

      if (status) {
        paramCount++;
        query += ` AND e.status = $${paramCount}`;
        params.push(status);
      }

      if (paymentStatus) {
        paramCount++;
        query += ` AND e.payment_status = $${paramCount}`;
        params.push(paymentStatus);
      }

      if (dateFrom) {
        paramCount++;
        query += ` AND e.enrolled_at >= $${paramCount}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        paramCount++;
        query += ` AND e.enrolled_at <= $${paramCount}`;
        params.push(dateTo);
      }

      // Count total
      const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add sorting and pagination
      paramCount++;
      query += ` ORDER BY e.enrolled_at DESC LIMIT $${paramCount}`;
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

export const getEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (process.env.MOCK_MODE === 'true') {
      const enrollment = mockEnrollments.find(e => e.id === parseInt(id));
      
      if (!enrollment) {
        throw new AppError('Enrollment not found', 404);
      }

      // Enrich with user, course, and schedule data
      const user = mockUsers.find(u => u.id === enrollment.user_id);
      const course = mockCourses.find(c => c.id === enrollment.course_id);
      const schedule = enrollment.schedule_id 
        ? mockSchedules.find(s => s.id === enrollment.schedule_id)
        : null;

      const enrichedEnrollment = {
        ...enrollment,
        email: user?.email || '',
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        phone: user?.phone || null,
        course_title: course?.title || '',
        course_level: course?.level || null,
        start_time: schedule?.start_time || null,
        end_time: schedule?.end_time || null,
        location: schedule?.location || null,
        teacher_id: schedule?.teacher_id || null
      };

      res.json({
        success: true,
        data: enrichedEnrollment
      });
    } else {
      const result = await pool.query(
        `SELECT e.*, 
                u.email, u.first_name, u.last_name, u.phone,
                c.title as course_title, c.level as course_level,
                s.start_time, s.end_time, s.location, s.teacher_id
         FROM enrollments e
         LEFT JOIN users u ON e.user_id = u.id
         LEFT JOIN courses c ON e.course_id = c.id
         LEFT JOIN schedules s ON e.schedule_id = s.id
         WHERE e.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Enrollment not found', 404);
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

export const createEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, userEmail, courseId, scheduleId, notes, source } = req.body;

    console.log('\n📝 Create Enrollment Request:');
    console.log('   Body:', JSON.stringify(req.body, null, 2));

    if (process.env.MOCK_MODE === 'true') {
      // Mock mode - find user by email if provided
      let finalUserId = userId;
      
      if (userEmail && !userId) {
        let user = mockUsers.find(u => u.email === userEmail);
        if (!user) {
          // User doesn't exist, create a new one
          const newUser = {
            id: getNextMockUserId(),
            email: userEmail,
            first_name: userEmail.split('@')[0],
            last_name: '',
            phone: null,
            role_id: 8, // 'user' role
            role_name: 'user',
            status: 'active',
            created_at: new Date(),
            updated_at: new Date()
          };
          mockUsers.push(newUser);
          finalUserId = newUser.id;
          console.log(`   ✅ Created new user: ${userEmail} (ID: ${finalUserId})`);
        } else {
          finalUserId = user.id;
          console.log(`   ✅ Found existing user: ${userEmail} (ID: ${finalUserId})`);
        }
      }

      if (!finalUserId || !courseId) {
        console.log(`   ❌ Missing required fields - userId: ${finalUserId}, courseId: ${courseId}`);
        throw new AppError('User and Course are required', 400);
      }

      // Check if already enrolled in this schedule
      if (scheduleId) {
        const existing = mockEnrollments.find(
          e => e.user_id === finalUserId && e.schedule_id === scheduleId
        );
        if (existing) {
          console.log(`   ❌ Already enrolled in schedule ${scheduleId}`);
          throw new AppError('User is already enrolled in this schedule', 409);
        }
      }

      const newEnrollment = {
        id: mockEnrollmentIdCounter++,
        user_id: finalUserId,
        course_id: courseId,
        schedule_id: scheduleId || null,
        notes: notes || null,
        source: source || 'admin',
        status: 'pending',
        payment_status: 'unpaid',
        enrolled_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockEnrollments.push(newEnrollment);

      console.log('\n🎓 MOCK MODE - Enrollment Created:');
      console.log(`   ID: ${newEnrollment.id}`);
      console.log(`   User ID: ${finalUserId}`);
      console.log(`   Course ID: ${courseId}`);
      console.log(`   Schedule ID: ${scheduleId || 'None'}`);
      console.log(`   Status: ${newEnrollment.status}\n`);

      res.status(201).json({
        success: true,
        data: newEnrollment
      });
    } else {
      // Database mode
      let finalUserId = userId;
      
      // If email provided, look up user ID or create new user
      if (userEmail && !userId) {
        const userResult = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [userEmail]
        );
        if (userResult.rows.length === 0) {
          // User doesn't exist, create a new user
          const newUserResult = await pool.query(
            `INSERT INTO users (email, first_name, last_name, role_id, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [userEmail, userEmail.split('@')[0], '', 8, 'active'] // role_id 8 = 'user', default name from email
          );
          finalUserId = newUserResult.rows[0].id;
          
          // Log activity
          await pool.query(
            `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
             VALUES ($1, 'user.created', 'user', $2)`,
            [req.user?.id, finalUserId]
          );
        } else {
          finalUserId = userResult.rows[0].id;
        }
      }

      if (!finalUserId || !courseId) {
        throw new AppError('User ID and Course ID are required', 400);
      }

      // Check if already enrolled in this schedule
      if (scheduleId) {
        const existing = await pool.query(
          'SELECT id FROM enrollments WHERE user_id = $1 AND schedule_id = $2',
          [finalUserId, scheduleId]
        );
        if (existing.rows.length > 0) {
          throw new AppError('User is already enrolled in this schedule', 409);
        }
      }

      const result = await pool.query(
        `INSERT INTO enrollments (user_id, course_id, schedule_id, notes, source, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING *`,
        [finalUserId, courseId, scheduleId, notes, source || 'admin']
      );

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
         VALUES ($1, 'enrollment.created', 'enrollment', $2)`,
        [req.user?.id, result.rows[0].id]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    }
  } catch (error) {
    console.log('   ❌ Error:', error);
    next(error);
  }
};

export const updateEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes, paymentStatus } = req.body;

    if (process.env.MOCK_MODE === 'true') {
      const enrollmentIndex = mockEnrollments.findIndex(e => e.id === parseInt(id));
      
      if (enrollmentIndex === -1) {
        throw new AppError('Enrollment not found', 404);
      }

      const enrollment = mockEnrollments[enrollmentIndex];
      
      if (status !== undefined) {
        enrollment.status = status;
      }
      if (notes !== undefined) {
        enrollment.notes = notes;
      }
      if (paymentStatus !== undefined) {
        enrollment.payment_status = paymentStatus;
      }
      enrollment.updated_at = new Date();

      console.log('\n📝 MOCK MODE - Enrollment Updated:');
      console.log(`   Enrollment ID: ${id}`);
      if (status !== undefined) console.log(`   Status: ${status}`);
      if (paymentStatus !== undefined) console.log(`   Payment Status: ${paymentStatus}`);
      if (notes !== undefined) console.log(`   Notes: ${notes}`);
      console.log('');

      res.json({
        success: true,
        data: enrollment
      });
    } else {
      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (status !== undefined) {
        paramCount++;
        updates.push(`status = $${paramCount}`);
        params.push(status);
      }
      if (notes !== undefined) {
        paramCount++;
        updates.push(`notes = $${paramCount}`);
        params.push(notes);
      }
      if (paymentStatus !== undefined) {
        paramCount++;
        updates.push(`payment_status = $${paramCount}`);
        params.push(paymentStatus);
      }

      if (updates.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      paramCount++;
      params.push(id);

      const result = await pool.query(
        `UPDATE enrollments SET ${updates.join(', ')}, updated_at = now() WHERE id = $${paramCount}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new AppError('Enrollment not found', 404);
      }

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, meta)
         VALUES ($1, 'enrollment.updated', 'enrollment', $2, $3)`,
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

export const approveEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (process.env.MOCK_MODE === 'true') {
      const enrollmentIndex = mockEnrollments.findIndex(e => e.id === parseInt(id));
      
      if (enrollmentIndex === -1) {
        throw new AppError('Enrollment not found', 404);
      }

      mockEnrollments[enrollmentIndex].status = 'approved';
      mockEnrollments[enrollmentIndex].updated_at = new Date();

      console.log('\n✅ MOCK MODE - Enrollment Approved:');
      console.log(`   Enrollment ID: ${id}`);
      console.log(`   Status: approved\n`);

      res.json({
        success: true,
        data: mockEnrollments[enrollmentIndex],
        message: 'Enrollment approved successfully'
      });
    } else {
      const result = await pool.query(
        `UPDATE enrollments SET status = 'approved', updated_at = now() WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Enrollment not found', 404);
      }

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
         VALUES ($1, 'enrollment.approved', 'enrollment', $2)`,
        [req.user?.id, id]
      );

      // TODO: Send email notification to student

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Enrollment approved successfully'
      });
    }
  } catch (error) {
    next(error);
  }
};

export const rejectEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE enrollments SET status = 'cancelled', notes = COALESCE(notes || E'\n', '') || $1, updated_at = now() 
       WHERE id = $2
       RETURNING *`,
      [reason ? `Rejected: ${reason}` : 'Rejected', id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Enrollment not found', 404);
    }

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, meta)
       VALUES ($1, 'enrollment.rejected', 'enrollment', $2, $3)`,
      [req.user?.id, id, JSON.stringify({ reason })]
    );

    // TODO: Send email notification to student

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Enrollment rejected'
    });
  } catch (error) {
    next(error);
  }
};

