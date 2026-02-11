import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { PaymentMethod, Currency } from '@prisma/client';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const itemSchema = z.object({
  bookId: z.string().uuid(),
  qty: z.number().int().positive(),
  unitPrice: z.number().nonnegative()
});

const createBookSaleSchema = z.object({
  soldAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  customerName: z.string().max(200).optional().nullable(),
  paymentMethod: z.enum(['CASH', 'KBZPAY', 'WAVEPAY', 'BANK', 'CARD']),
  currency: z.enum(['MMK', 'KRW', 'USD']).optional(),
  items: z.array(itemSchema).min(1)
});

const updateItemSchema = z.object({
  id: z.string().uuid().optional(),
  bookId: z.string().uuid(),
  qty: z.number().int().positive(),
  unitPrice: z.number().nonnegative()
});

const updateBookSaleSchema = z.object({
  soldAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  customerName: z.string().max(200).optional().nullable(),
  paymentMethod: z.enum(['CASH', 'KBZPAY', 'WAVEPAY', 'BANK', 'CARD']).optional(),
  currency: z.enum(['MMK', 'KRW', 'USD']).optional(),
  items: z.array(updateItemSchema).min(1)
});

function parseDate(s: string): Date {
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new AppError('Invalid date', 400);
  return d;
}

async function getOrCreateBookSalesCategory(tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): Promise<string> {
  const client = tx ?? prisma;
  let cat = await client.financeCategory.findFirst({
    where: { type: 'REVENUE', name: 'Book Sales', isActive: true }
  });
  if (!cat) {
    cat = await client.financeCategory.create({
      data: { type: 'REVENUE', name: 'Book Sales', isActive: true }
    });
  }
  return cat.id;
}

export const getBookSales = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const where: { soldAt?: { gte?: Date; lte?: Date } } = {};
    if (from) where.soldAt = { ...where.soldAt, gte: parseDate(from) };
    if (to) {
      const end = parseDate(to);
      end.setHours(23, 59, 59, 999);
      where.soldAt = { ...where.soldAt, lte: end };
    }

    const sales = await prisma.bookSale.findMany({
      where,
      include: {
        items: { include: { book: { select: { id: true, title: true } } } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { soldAt: 'desc' }
    });

    res.json({
      success: true,
      data: sales.map((s) => ({
        id: s.id,
        soldAt: s.soldAt,
        customerName: s.customerName,
        paymentMethod: s.paymentMethod,
        currency: s.currency,
        totalAmount: Number(s.totalAmount),
        profitAmount: s.profitAmount != null ? Number(s.profitAmount) : null,
        createdByUserId: s.createdByUserId,
        createdByUser: s.createdByUser,
        items: s.items.map((i) => ({
          id: i.id,
          bookId: i.bookId,
          book: i.book,
          qty: i.qty,
          unitPrice: Number(i.unitPrice),
          lineTotal: i.qty * Number(i.unitPrice)
        })),
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const createBookSale = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401);

    const parsed = createBookSaleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join(', ') || 'Validation failed', 400);
    }

    const { soldAt, customerName, paymentMethod, currency, items } = parsed.data;
    const totalAmount = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

    const bookIds = [...new Set(items.map((i) => i.bookId))];
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, costPrice: true }
    });
    const bookCostMap = new Map(books.map((b) => [b.id, b.costPrice != null ? Number(b.costPrice) : null]));

    let totalProfit = 0;
    let costPriceMissing = false;
    for (const i of items) {
      const costPrice = bookCostMap.get(i.bookId) ?? null;
      if (costPrice === null) costPriceMissing = true;
      const cost = costPrice ?? 0;
      totalProfit += (i.unitPrice - cost) * i.qty;
    }

    const sale = await prisma.$transaction(async (tx) => {
      const categoryId = await getOrCreateBookSalesCategory(tx);
      const saleRecord = await tx.bookSale.create({
        data: {
          soldAt: parseDate(soldAt),
          customerName: customerName ?? undefined,
          paymentMethod: paymentMethod as PaymentMethod,
          currency: (currency as Currency) ?? 'MMK',
          totalAmount: new Decimal(totalAmount),
          profitAmount: new Decimal(totalProfit),
          createdByUserId: userId
        }
      });

      await tx.bookSaleItem.createMany({
        data: items.map((i) => ({
          saleId: saleRecord.id,
          bookId: i.bookId,
          qty: i.qty,
          unitPrice: new Decimal(i.unitPrice)
        }))
      });

      const note = `Book sale gross=${totalAmount}, profit=${totalProfit}`;
      await tx.financeTransaction.create({
        data: {
          type: 'REVENUE',
          categoryId,
          amount: new Decimal(totalProfit),
          currency: (currency as Currency) ?? 'MMK',
          paymentMethod: paymentMethod as PaymentMethod,
          occurredAt: parseDate(soldAt),
          note,
          referenceType: 'BOOK_SALE',
          referenceId: saleRecord.id,
          createdByUserId: userId
        }
      });

      return tx.bookSale.findUnique({
        where: { id: saleRecord.id },
        include: {
          items: { include: { book: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true } }
        }
      });
    });

    if (!sale) throw new AppError('Failed to create sale', 500);

    res.status(201).json({
      success: true,
      data: {
        ...sale,
        totalAmount: Number(sale.totalAmount),
        profitAmount: sale.profitAmount != null ? Number(sale.profitAmount) : null,
        items: sale.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice)
        }))
      },
      costPriceMissingWarning: costPriceMissing
    });
  } catch (error) {
    next(error);
  }
};

export const updateBookSale = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401);

    const saleId = req.params.id as string;
    if (!saleId) throw new AppError('Sale ID required', 400);

    const parsed = updateBookSaleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join(', ') || 'Validation failed', 400);
    }

    const existing = await prisma.bookSale.findUnique({
      where: { id: saleId },
      include: { items: true }
    });
    if (!existing) throw new AppError('Book sale not found', 404);

    const payload = parsed.data;
    const itemIdsInPayload = new Set(
      payload.items.map((i) => i.id).filter((id): id is string => id != null)
    );

    const updated = await prisma.$transaction(async (tx) => {
      const toDelete = existing.items.filter((i) => !itemIdsInPayload.has(i.id));
      if (toDelete.length > 0) {
        await tx.bookSaleItem.deleteMany({
          where: { id: { in: toDelete.map((i) => i.id) } }
        });
      }

      for (const it of payload.items) {
        if (it.id) {
          await tx.bookSaleItem.update({
            where: { id: it.id },
            data: {
              bookId: it.bookId,
              qty: it.qty,
              unitPrice: new Decimal(it.unitPrice)
            }
          });
        } else {
          await tx.bookSaleItem.create({
            data: {
              saleId,
              bookId: it.bookId,
              qty: it.qty,
              unitPrice: new Decimal(it.unitPrice)
            }
          });
        }
      }

      const itemsAfter = await tx.bookSaleItem.findMany({
        where: { saleId },
        include: { book: { select: { id: true, costPrice: true } } }
      });

      let totalAmount = 0;
      let totalProfit = 0;
      for (const i of itemsAfter) {
        const up = Number(i.unitPrice);
        const cost = i.book.costPrice != null ? Number(i.book.costPrice) : 0;
        totalAmount += i.qty * up;
        totalProfit += (up - cost) * i.qty;
      }

      const soldAt = payload.soldAt != null ? parseDate(payload.soldAt) : existing.soldAt;
      const note = `Book sale gross=${totalAmount}, profit=${totalProfit}`;

      await tx.bookSale.update({
        where: { id: saleId },
        data: {
          soldAt,
          ...(payload.customerName !== undefined && { customerName: payload.customerName ?? undefined }),
          ...(payload.paymentMethod != null && { paymentMethod: payload.paymentMethod as PaymentMethod }),
          ...(payload.currency != null && { currency: payload.currency as Currency }),
          totalAmount: new Decimal(totalAmount),
          profitAmount: new Decimal(totalProfit)
        }
      });

      const linked = await tx.financeTransaction.findFirst({
        where: { referenceType: 'BOOK_SALE', referenceId: saleId, isDeleted: false }
      });
      if (linked) {
        await tx.financeTransaction.update({
          where: { id: linked.id },
          data: {
            amount: new Decimal(totalProfit),
            note,
            occurredAt: soldAt,
            ...(payload.paymentMethod != null && { paymentMethod: payload.paymentMethod as PaymentMethod }),
            ...(payload.currency != null && { currency: payload.currency as Currency })
          }
        });
      }

      return tx.bookSale.findUnique({
        where: { id: saleId },
        include: {
          items: { include: { book: { select: { id: true, title: true } } } },
          createdByUser: { select: { id: true, firstName: true, lastName: true } }
        }
      });
    });

    if (!updated) throw new AppError('Failed to update sale', 500);

    res.json({
      success: true,
      data: {
        ...updated,
        totalAmount: Number(updated.totalAmount),
        profitAmount: updated.profitAmount != null ? Number(updated.profitAmount) : null,
        items: updated.items.map((i) => ({
          id: i.id,
          bookId: i.bookId,
          book: i.book,
          qty: i.qty,
          unitPrice: Number(i.unitPrice),
          lineTotal: i.qty * Number(i.unitPrice)
        })),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};
