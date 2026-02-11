import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { FinanceType, PaymentMethod, Currency } from '@prisma/client';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const createTransactionSchema = z.object({
  type: z.enum(['REVENUE', 'EXPENSE']),
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.enum(['MMK', 'KRW', 'USD']).optional(),
  paymentMethod: z.enum(['CASH', 'KBZPAY', 'WAVEPAY', 'BANK', 'CARD']),
  occurredAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  note: z.string().max(2000).optional().nullable(),
  referenceType: z.string().max(100).optional().nullable(),
  referenceId: z.string().max(100).optional().nullable()
});

const updateTransactionSchema = z.object({
  categoryId: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  currency: z.enum(['MMK', 'KRW', 'USD']).optional(),
  paymentMethod: z.enum(['CASH', 'KBZPAY', 'WAVEPAY', 'BANK', 'CARD']).optional(),
  occurredAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  note: z.string().max(2000).optional().nullable(),
  referenceType: z.string().max(100).optional().nullable(),
  referenceId: z.string().max(100).optional().nullable()
});

function parseDate(s: string): Date {
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new AppError('Invalid date', 400);
  return d;
}

export const getTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      type,
      from,
      to,
      categoryId,
      paymentMethod,
      q,
      page = '1',
      pageSize = '20'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize as string) || 20));
    const skip = (pageNum - 1) * limit;

    const where: {
      isDeleted: boolean;
      type?: FinanceType;
      categoryId?: string;
      paymentMethod?: PaymentMethod;
      occurredAt?: { gte?: Date; lte?: Date };
      note?: { contains: string; mode: 'insensitive' };
    } = { isDeleted: false };

    if (type === 'REVENUE' || type === 'EXPENSE') where.type = type as FinanceType;
    if (categoryId && typeof categoryId === 'string') where.categoryId = categoryId;
    if (paymentMethod && typeof paymentMethod === 'string' && ['CASH', 'KBZPAY', 'WAVEPAY', 'BANK', 'CARD'].includes(paymentMethod)) {
      where.paymentMethod = paymentMethod as PaymentMethod;
    }
    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt.gte = parseDate(from as string);
      if (to) {
        const end = parseDate(to as string);
        end.setHours(23, 59, 59, 999);
        where.occurredAt.lte = end;
      }
    }
    if (q && typeof q === 'string' && q.trim()) {
      where.note = { contains: q.trim(), mode: 'insensitive' };
    }

    const [transactions, total] = await Promise.all([
      prisma.financeTransaction.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, type: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } }
        },
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.financeTransaction.count({ where })
    ]);

    const data = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      categoryId: t.categoryId,
      category: t.category,
      amount: Number(t.amount),
      currency: t.currency,
      paymentMethod: t.paymentMethod,
      occurredAt: t.occurredAt,
      note: t.note,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      createdByUserId: t.createdByUserId,
      createdByUser: t.createdByUser,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401);

    const parsed = createTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join(', ') || 'Validation failed', 400);
    }
    const { categoryId, amount, currency, paymentMethod, occurredAt, note, referenceType, referenceId } = parsed.data;
    const type = parsed.data.type as FinanceType;

    const category = await prisma.financeCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new AppError('Category not found', 404);
    if (category.type !== type) throw new AppError('Category type does not match transaction type', 400);

    const transaction = await prisma.financeTransaction.create({
      data: {
        type,
        categoryId,
        amount: new Decimal(amount),
        currency: (currency as Currency) ?? 'MMK',
        paymentMethod: paymentMethod as PaymentMethod,
        occurredAt: parseDate(occurredAt),
        note: note ?? undefined,
        referenceType: referenceType ?? undefined,
        referenceId: referenceId ?? undefined,
        createdByUserId: userId
      },
      include: {
        category: { select: { id: true, name: true, type: true } }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        ...transaction,
        amount: Number(transaction.amount)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = updateTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join(', ') || 'Validation failed', 400);
    }

    const existing = await prisma.financeTransaction.findFirst({ where: { id, isDeleted: false } });
    if (!existing) throw new AppError('Transaction not found', 404);

    const updateData: {
      categoryId?: string;
      amount?: Decimal;
      currency?: Currency;
      paymentMethod?: PaymentMethod;
      occurredAt?: Date;
      note?: string | null;
      referenceType?: string | null;
      referenceId?: string | null;
    } = {};
    if (parsed.data.categoryId !== undefined) updateData.categoryId = parsed.data.categoryId;
    if (parsed.data.amount !== undefined) updateData.amount = new Decimal(parsed.data.amount);
    if (parsed.data.currency !== undefined) updateData.currency = parsed.data.currency as Currency;
    if (parsed.data.paymentMethod !== undefined) updateData.paymentMethod = parsed.data.paymentMethod as PaymentMethod;
    if (parsed.data.occurredAt !== undefined) updateData.occurredAt = parseDate(parsed.data.occurredAt);
    if (parsed.data.note !== undefined) updateData.note = parsed.data.note;
    if (parsed.data.referenceType !== undefined) updateData.referenceType = parsed.data.referenceType;
    if (parsed.data.referenceId !== undefined) updateData.referenceId = parsed.data.referenceId;

    const transaction = await prisma.financeTransaction.update({
      where: { id },
      data: updateData,
      include: { category: { select: { id: true, name: true, type: true } } }
    });

    res.json({
      success: true,
      data: { ...transaction, amount: Number(transaction.amount) }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.financeTransaction.findFirst({ where: { id, isDeleted: false } });
    if (!existing) throw new AppError('Transaction not found', 404);

    await prisma.financeTransaction.update({
      where: { id },
      data: { isDeleted: true }
    });

    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    next(error);
  }
};
