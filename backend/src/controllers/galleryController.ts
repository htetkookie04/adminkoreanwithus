import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
    const entries = await prisma.gallery.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Format response
    const formattedEntries = entries.map(entry => ({
      id: entry.id,
      image_url: entry.imageUrl,
      caption: entry.caption,
      sort_order: entry.sortOrder,
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

export const getGalleryPublic = async (req: any, res: Response, next: NextFunction) => {
  try {
    const entries = await prisma.gallery.findMany({
      select: {
        id: true,
        imageUrl: true,
        caption: true,
        sortOrder: true
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Format response
    const formattedEntries = entries.map(entry => ({
      id: entry.id,
      image_url: entry.imageUrl,
      caption: entry.caption,
      sort_order: entry.sortOrder
    }));

    res.json({
      success: true,
      data: formattedEntries
    });
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

    // Construct image URL
    const imageUrl = `/uploads/gallery/${req.file.filename}`;

    // Get max sort_order
    const maxOrderResult = await prisma.gallery.aggregate({
      _max: {
        sortOrder: true
      }
    });
    const sortOrder = (maxOrderResult._max.sortOrder || 0) + 1;

    const entry = await prisma.gallery.create({
      data: {
        imageUrl,
        caption: caption || null,
        sortOrder
      }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'gallery.created',
          resourceType: 'gallery',
          resourceId: entry.id
        }
      });
    }

    // Format response
    const formattedEntry = {
      id: entry.id,
      image_url: entry.imageUrl,
      caption: entry.caption,
      sort_order: entry.sortOrder,
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

export const updateGalleryEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { caption, sortOrder } = req.body;

    // Build update data
    const updateData: any = {};

    if (caption !== undefined) updateData.caption = caption;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const entry = await prisma.gallery.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'gallery.updated',
          resourceType: 'gallery',
          resourceId: parseInt(id),
          meta: { changes: req.body }
        }
      });
    }

    // Format response
    const formattedEntry = {
      id: entry.id,
      image_url: entry.imageUrl,
      caption: entry.caption,
      sort_order: entry.sortOrder,
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
      throw new AppError('Gallery entry not found', 404);
    }
    next(error);
  }
};

export const reorderGallery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body; // Array of { id, sortOrder }

    if (!Array.isArray(items)) {
      throw new AppError('Items must be an array', 400);
    }

    // Update sort_order for each item
    await Promise.all(
      items.map(item =>
        prisma.gallery.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder }
        })
      )
    );

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'gallery.reordered',
          resourceType: 'gallery',
          meta: { items }
        }
      });
    }

    res.json({
      success: true,
      message: 'Gallery reordered successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteGalleryEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get entry to delete file
    const entry = await prisma.gallery.findUnique({
      where: { id: parseInt(id) }
    });

    if (!entry) {
      throw new AppError('Gallery entry not found', 404);
    }

    // Delete file from filesystem
    const imagePath = path.join(__dirname, '../../', entry.imageUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Delete from database
    await prisma.gallery.delete({
      where: { id: parseInt(id) }
    });

    // Log activity
    if (req.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'gallery.deleted',
          resourceType: 'gallery',
          resourceId: parseInt(id)
        }
      });
    }

    res.json({
      success: true,
      message: 'Gallery entry deleted successfully'
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma record not found
      throw new AppError('Gallery entry not found', 404);
    }
    next(error);
  }
};
