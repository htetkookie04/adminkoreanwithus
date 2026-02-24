import { Response, NextFunction } from 'express';
import { pool } from '../db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getInquiries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      assignedTo,
      priority,
      page = '1',
      per_page = '20'
    } = req.query;

    const limit = parseInt(per_page as string);
    const offset = (parseInt(page as string) - 1) * limit;

    let query = `
      SELECT i.*, 
             u.first_name || ' ' || u.last_name as assigned_to_name
      FROM inquiries i
      LEFT JOIN users u ON i.assigned_to = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND i.status = $${paramCount}`;
      params.push(status);
    }

    if (assignedTo) {
      paramCount++;
      query += ` AND i.assigned_to = $${paramCount}`;
      params.push(assignedTo);
    }

    if (priority) {
      paramCount++;
      query += ` AND i.priority = $${paramCount}`;
      params.push(priority);
    }

    // Count total
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add sorting and pagination
    paramCount++;
    query += ` ORDER BY i.created_at DESC LIMIT $${paramCount}`;
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
  } catch (error) {
    next(error);
  }
};

export const getInquiry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get inquiry
    const inquiryResult = await pool.query(
      `SELECT i.*, u.first_name || ' ' || u.last_name as assigned_to_name
       FROM inquiries i
       LEFT JOIN users u ON i.assigned_to = u.id
       WHERE i.id = $1`,
      [id]
    );

    if (inquiryResult.rows.length === 0) {
      throw new AppError('Inquiry not found', 404);
    }

    // Get replies
    const repliesResult = await pool.query(
      `SELECT ir.*, u.first_name || ' ' || u.last_name as user_name
       FROM inquiry_replies ir
       LEFT JOIN users u ON ir.user_id = u.id
       WHERE ir.inquiry_id = $1
       ORDER BY ir.created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...inquiryResult.rows[0],
        replies: repliesResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

const MAX_LENGTH = { name: 200, email: 255, phone: 50, subject: 500, message: 5000, source: 100 };

export const createInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, subject, message, source } = req.body as any;

    if (!name || !email || !message) {
      throw new AppError('Name, email, and message are required', 400);
    }

    const n = String(name).trim();
    const e = String(email).trim().toLowerCase();
    const m = String(message).trim();
    if (!n || !e || !m) {
      throw new AppError('Name, email, and message are required', 400);
    }
    if (n.length > MAX_LENGTH.name) throw new AppError(`Name must be at most ${MAX_LENGTH.name} characters`, 400);
    if (e.length > MAX_LENGTH.email) throw new AppError(`Email must be at most ${MAX_LENGTH.email} characters`, 400);
    if (m.length > MAX_LENGTH.message) throw new AppError(`Message must be at most ${MAX_LENGTH.message} characters`, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new AppError('Invalid email format', 400);
    const phoneVal = phone != null ? String(phone).trim() : null;
    const subjVal = subject != null ? String(subject).trim() : null;
    const srcVal = source != null ? String(source).trim() : 'website';
    if (phoneVal && phoneVal.length > MAX_LENGTH.phone) throw new AppError(`Phone must be at most ${MAX_LENGTH.phone} characters`, 400);
    if (subjVal && subjVal.length > MAX_LENGTH.subject) throw new AppError(`Subject must be at most ${MAX_LENGTH.subject} characters`, 400);
    if (srcVal.length > MAX_LENGTH.source) throw new AppError(`Source must be at most ${MAX_LENGTH.source} characters`, 400);

    const result = await pool.query(
      `INSERT INTO inquiries (name, email, phone, subject, message, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [n, e, phoneVal, subjVal || null, m, srcVal]
    );

    // TODO: Send notification email to support team

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Inquiry submitted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const updateInquiry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, priority } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }
    if (assignedTo !== undefined) {
      paramCount++;
      updates.push(`assigned_to = $${paramCount}`);
      params.push(assignedTo);
    }
    if (priority !== undefined) {
      paramCount++;
      updates.push(`priority = $${paramCount}`);
      params.push(priority);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    paramCount++;
    params.push(id);

    const result = await pool.query(
      `UPDATE inquiries SET ${updates.join(', ')}, updated_at = now() WHERE id = $${paramCount}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new AppError('Inquiry not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const addReply = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { message, isInternal } = req.body;

    if (!message) {
      throw new AppError('Message is required', 400);
    }

    // Verify inquiry exists
    const inquiry = await pool.query('SELECT id FROM inquiries WHERE id = $1', [id]);
    if (inquiry.rows.length === 0) {
      throw new AppError('Inquiry not found', 404);
    }

    const result = await pool.query(
      `INSERT INTO inquiry_replies (inquiry_id, user_id, message, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, req.user?.id, message, isInternal || false]
    );

    // Update inquiry status if replying (not internal)
    if (!isInternal) {
      await pool.query(
        `UPDATE inquiries SET status = 'replied', updated_at = now() WHERE id = $1`,
        [id]
      );
    }

    // TODO: Send email to customer if not internal

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

