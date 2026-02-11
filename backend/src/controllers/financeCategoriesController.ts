import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { FinanceType } from '@prisma/client';
import { z } from 'zod';

const createCategorySchema = z.object({
  type: z.enum(['REVENUE', 'EXPENSE']),
  name: z.string().min(1).max(200),
  parentId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional()
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  parentId: z.union([z.string().uuid(), z.literal(''), z.null()]).optional().transform((v) => (v === '' ? null : v)),
  isActive: z.boolean().optional()
});

export const getCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const type = req.query.type as string | undefined;
    if (type && type !== 'REVENUE' && type !== 'EXPENSE') {
      throw new AppError('Invalid type. Use REVENUE or EXPENSE', 400);
    }

    const where: { type?: FinanceType; isActive?: boolean } = { isActive: true };
    if (type) where.type = type as FinanceType;

    const categories = await prisma.financeCategory.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: { parent: { select: { id: true, name: true } } }
    });

    res.json({
      success: true,
      data: categories.map((c) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        parentId: c.parentId,
        parent: c.parent,
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join(', ') || 'Validation failed', 400);
    }
    const { type, name, parentId, isActive } = parsed.data;

    const category = await prisma.financeCategory.create({
      data: {
        type: type as FinanceType,
        name,
        parentId: parentId ?? undefined,
        isActive: isActive ?? true
      }
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join(', ') || 'Validation failed', 400);
    }

    const existing = await prisma.financeCategory.findUnique({ where: { id } });
    if (!existing) throw new AppError('Category not found', 404);

    const category = await prisma.financeCategory.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.parentId !== undefined && { parentId: parsed.data.parentId }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive })
      }
    });

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};
