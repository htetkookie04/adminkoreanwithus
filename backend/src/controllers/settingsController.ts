import { Response, NextFunction } from 'express';
import { pool } from '../db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT * FROM settings ORDER BY key');

    const settings: Record<string, any> = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

export const updateSetting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      throw new AppError('Value is required', 400);
    }

    const result = await pool.query(
      `INSERT INTO settings (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_by = $3, updated_at = now()
       RETURNING *`,
      [key, JSON.stringify(value), req.user?.id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, meta)
       VALUES ($1, 'setting.updated', 'setting', $2, $3)`,
      [req.user?.id, key, JSON.stringify({ value })]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

