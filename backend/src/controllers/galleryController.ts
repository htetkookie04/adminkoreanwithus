import { Response, NextFunction } from 'express';
import { pool } from '../db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Mock data store for development
export let mockGallery: any[] = [];
let mockGalleryIdCounter = 1;

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads/gallery');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed (jpeg, jpg, png, gif, webp)', 400));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

export const getGallery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (process.env.MOCK_MODE === 'true') {
      const sorted = [...mockGallery].sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      res.json({
        success: true,
        data: sorted
      });
    } else {
      const result = await pool.query(
        'SELECT * FROM gallery ORDER BY sort_order ASC, created_at DESC'
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

export const getGalleryPublic = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (process.env.MOCK_MODE === 'true') {
      const sorted = [...mockGallery]
        .map(({ id, image_url, caption, sort_order }) => ({ id, image_url, caption, sort_order }))
        .sort((a, b) => {
          if (a.sort_order !== b.sort_order) {
            return a.sort_order - b.sort_order;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

      res.json({
        success: true,
        data: sorted
      });
    } else {
      const result = await pool.query(
        'SELECT id, image_url, caption, sort_order FROM gallery ORDER BY sort_order ASC, created_at DESC'
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

export const createGalleryEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('Image file is required', 400);
    }

    const { caption } = req.body;

    if (process.env.MOCK_MODE === 'true') {
      // In mock mode, store a placeholder URL or use the file info
      // For simplicity, we'll use a data URL approach or placeholder
      const imageUrl = `/uploads/gallery/mock-${mockGalleryIdCounter}${path.extname(req.file.originalname)}`;
      
      // Get max sort_order
      const maxOrder = mockGallery.length > 0 
        ? Math.max(...mockGallery.map(item => item.sort_order), 0)
        : 0;
      const sortOrder = maxOrder + 1;

      const newEntry = {
        id: mockGalleryIdCounter++,
        image_url: imageUrl,
        caption: caption || null,
        sort_order: sortOrder,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockGallery.push(newEntry);

      console.log('\n🖼️  MOCK MODE - Gallery Image Uploaded:');
      console.log(`   ID: ${newEntry.id}`);
      console.log(`   Filename: ${req.file.originalname}`);
      console.log(`   Caption: ${caption || '(none)'}\n`);

      res.status(201).json({
        success: true,
        data: newEntry
      });
    } else {
      // Construct image URL (in production, use cloud storage URL)
      const imageUrl = `/uploads/gallery/${req.file.filename}`;

      // Get max sort_order
      const maxOrderResult = await pool.query(
        'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM gallery'
      );
      const sortOrder = (maxOrderResult.rows[0].max_order || 0) + 1;

      const result = await pool.query(
        `INSERT INTO gallery (image_url, caption, sort_order)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [imageUrl, caption || null, sortOrder]
      );

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
         VALUES ($1, 'gallery.created', 'gallery', $2)`,
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

export const updateGalleryEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { caption, sortOrder } = req.body;

    if (process.env.MOCK_MODE === 'true') {
      const entryIndex = mockGallery.findIndex(item => item.id === parseInt(id));
      
      if (entryIndex === -1) {
        throw new AppError('Gallery entry not found', 404);
      }

      const entry = mockGallery[entryIndex];

      if (caption !== undefined) {
        entry.caption = caption;
      }
      if (sortOrder !== undefined) {
        entry.sort_order = parseInt(sortOrder);
      }
      entry.updated_at = new Date();

      console.log('\n📝 MOCK MODE - Gallery Entry Updated:');
      console.log(`   ID: ${id}`);
      console.log(`   Caption: ${entry.caption || '(none)'}\n`);

      res.json({
        success: true,
        data: entry
      });
    } else {
      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (caption !== undefined) {
        paramCount++;
        updates.push(`caption = $${paramCount}`);
        params.push(caption);
      }
      if (sortOrder !== undefined) {
        paramCount++;
        updates.push(`sort_order = $${paramCount}`);
        params.push(parseInt(sortOrder));
      }

      if (updates.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      paramCount++;
      params.push(id);

      const result = await pool.query(
        `UPDATE gallery SET ${updates.join(', ')}, updated_at = now() WHERE id = $${paramCount}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new AppError('Gallery entry not found', 404);
      }

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, meta)
         VALUES ($1, 'gallery.updated', 'gallery', $2, $3)`,
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

export const reorderGallery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body; // Array of { id, sortOrder }

    if (!Array.isArray(items)) {
      throw new AppError('Items must be an array', 400);
    }

    if (process.env.MOCK_MODE === 'true') {
      // Update sort_order for each item in mock data
      for (const item of items) {
        const entry = mockGallery.find(e => e.id === item.id);
        if (entry) {
          entry.sort_order = item.sortOrder;
          entry.updated_at = new Date();
        }
      }

      console.log('\n🔄 MOCK MODE - Gallery Reordered:');
      console.log(`   Items: ${items.length}\n`);

      res.json({
        success: true,
        message: 'Gallery reordered successfully'
      });
    } else {
      // Update sort_order for each item
      for (const item of items) {
        await pool.query(
          'UPDATE gallery SET sort_order = $1 WHERE id = $2',
          [item.sortOrder, item.id]
        );
      }

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, meta)
         VALUES ($1, 'gallery.reordered', 'gallery', $2)`,
        [req.user?.id, JSON.stringify({ items })]
      );

      res.json({
        success: true,
        message: 'Gallery reordered successfully'
      });
    }
  } catch (error) {
    next(error);
  }
};

export const deleteGalleryEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (process.env.MOCK_MODE === 'true') {
      const entryIndex = mockGallery.findIndex(item => item.id === parseInt(id));
      
      if (entryIndex === -1) {
        throw new AppError('Gallery entry not found', 404);
      }

      const deletedEntry = mockGallery.splice(entryIndex, 1)[0];

      console.log('\n🗑️  MOCK MODE - Gallery Entry Deleted:');
      console.log(`   ID: ${id}`);
      console.log(`   Image URL: ${deletedEntry.image_url}\n`);

      res.json({
        success: true,
        message: 'Gallery entry deleted successfully'
      });
    } else {
      // Get image URL to delete file
      const result = await pool.query('SELECT image_url FROM gallery WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        throw new AppError('Gallery entry not found', 404);
      }

      // Delete file from filesystem
      const imagePath = path.join(__dirname, '../../', result.rows[0].image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      // Delete from database
      await pool.query('DELETE FROM gallery WHERE id = $1', [id]);

      // Log activity
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
         VALUES ($1, 'gallery.deleted', 'gallery', $2)`,
        [req.user?.id, id]
      );

      res.json({
        success: true,
        message: 'Gallery entry deleted successfully'
      });
    }
  } catch (error) {
    next(error);
  }
};

