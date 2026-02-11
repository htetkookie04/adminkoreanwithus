import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const createBookSchema = z.object({
  title: z.string().min(1).max(500),
  sku: z.string().max(100).optional().nullable(),
  salePrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative().optional().nullable(),
  isActive: z.boolean().optional()
});

const updateBookSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  sku: z.string().max(100).optional().nullable(),
  salePrice: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().optional().nullable(),
  isActive: z.boolean().optional()
});

export const getBooks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const where = activeOnly ? { isActive: true } : {};

    const books = await prisma.book.findMany({
      where,
      orderBy: { title: 'asc' }
    });

    res.json({
      success: true,
      data: books.map((b) => ({
        id: b.id,
        title: b.title,
        sku: b.sku,
        salePrice: Number(b.salePrice),
        costPrice: b.costPrice != null ? Number(b.costPrice) : null,
        isActive: b.isActive,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const createBook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createBookSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join(', ') || 'Validation failed', 400);
    }
    const { title, sku, salePrice, costPrice, isActive } = parsed.data;

    const book = await prisma.book.create({
      data: {
        title,
        sku: sku ?? undefined,
        salePrice: new Decimal(salePrice),
        costPrice: costPrice != null ? new Decimal(costPrice) : undefined,
        isActive: isActive ?? true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        ...book,
        salePrice: Number(book.salePrice),
        costPrice: book.costPrice != null ? Number(book.costPrice) : null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateBook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = updateBookSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join(', ') || 'Validation failed', 400);
    }

    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) throw new AppError('Book not found', 404);

    const updateData: { title?: string; sku?: string | null; salePrice?: Decimal; costPrice?: Decimal | null; isActive?: boolean } = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.sku !== undefined) updateData.sku = parsed.data.sku;
    if (parsed.data.salePrice !== undefined) updateData.salePrice = new Decimal(parsed.data.salePrice);
    if (parsed.data.costPrice !== undefined) updateData.costPrice = parsed.data.costPrice != null ? new Decimal(parsed.data.costPrice) : null;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

    const book = await prisma.book.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: {
        ...book,
        salePrice: Number(book.salePrice),
        costPrice: book.costPrice != null ? Number(book.costPrice) : null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) throw new AppError('Book not found', 404);

    await prisma.book.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ success: true, data: { id, deactivated: true } });
  } catch (error) {
    next(error);
  }
};
