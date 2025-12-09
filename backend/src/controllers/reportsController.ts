import { Response, NextFunction } from 'express';
import { pool } from '../db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getEnrollmentReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { start, end, groupBy = 'day' } = req.query;

    if (!start || !end) {
      throw new AppError('Start and end dates are required', 400);
    }

    let dateFormat = 'YYYY-MM-DD';
    if (groupBy === 'month') {
      dateFormat = 'YYYY-MM';
    } else if (groupBy === 'year') {
      dateFormat = 'YYYY';
    }

    const result = await pool.query(
      `SELECT 
         TO_CHAR(enrolled_at, $1) as period,
         COUNT(*) as count,
         COUNT(*) FILTER (WHERE status = 'approved') as approved,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
       FROM enrollments
       WHERE enrolled_at >= $2 AND enrolled_at <= $3
       GROUP BY period
       ORDER BY period ASC`,
      [dateFormat, start, end]
    );

    // Get course breakdown
    const courseBreakdown = await pool.query(
      `SELECT 
         c.title,
         COUNT(*) as enrollments,
         COUNT(*) FILTER (WHERE e.status = 'approved') as approved
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.enrolled_at >= $1 AND e.enrolled_at <= $2
       GROUP BY c.id, c.title
       ORDER BY enrollments DESC`,
      [start, end]
    );

    res.json({
      success: true,
      data: {
        timeline: result.rows,
        courseBreakdown: courseBreakdown.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAISummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { period = 'last_30_days' } = req.query;

    // Calculate date range
    let startDate: Date;
    const endDate = new Date();

    if (period === 'last_7_days') {
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'last_30_days') {
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === 'last_90_days') {
      startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Gather data
    const [
      totalUsers,
      newUsers,
      enrollments,
      topCourses,
      pendingEnrollments,
      inquiries
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users WHERE status = $1', ['active']),
      pool.query(
        'SELECT COUNT(*) as count FROM users WHERE created_at >= $1',
        [startDate]
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM enrollments WHERE enrolled_at >= $1`,
        [startDate]
      ),
      pool.query(
        `SELECT c.title, COUNT(*) as count
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         WHERE e.enrolled_at >= $1
         GROUP BY c.id, c.title
         ORDER BY count DESC
         LIMIT 5`,
        [startDate]
      ),
      pool.query(
        "SELECT COUNT(*) as count FROM enrollments WHERE status = 'pending'"
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM inquiries WHERE status = 'new' OR status = 'pending'`
      )
    ]);

    const data = {
      total_users: parseInt(totalUsers.rows[0].count),
      new_registrations: parseInt(newUsers.rows[0].count),
      enrollments_last_period: parseInt(enrollments.rows[0].count),
      top_courses: topCourses.rows,
      pending_enrollments: parseInt(pendingEnrollments.rows[0].count),
      pending_inquiries: parseInt(inquiries.rows[0].count),
      period: period as string
    };

    // TODO: Call AI service to generate summary
    // For now, return structured data
    res.json({
      success: true,
      data: {
        metrics: data,
        summary: 'AI summary generation not yet implemented. Install AI service dependencies and configure API keys.',
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

