import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { PayrollStatus, PaymentMethod, Currency } from '@prisma/client';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const updatePayrollSchema = z.object({
  baseSalary: z.number().nonnegative().optional(),
  bonus: z.number().nonnegative().optional(),
  deduction: z.number().nonnegative().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'PAID']).optional()
});

const payPayrollSchema = z.object({
  paymentMethod: z.enum(['CASH', 'KBZPAY', 'WAVEPAY', 'BANK', 'CARD'])
});

async function getOrCreatePayrollCategory(): Promise<string> {
  let cat = await prisma.financeCategory.findFirst({
    where: { type: 'EXPENSE', name: 'Payroll', isActive: true }
  });
  if (!cat) {
    cat = await prisma.financeCategory.create({
      data: { type: 'EXPENSE', name: 'Payroll', isActive: true }
    });
  }
  return cat.id;
}

function firstDayOfMonth(monthStr: string): Date {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
}

export const getPayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = req.query.month as string | undefined;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new AppError('Query month is required and must be YYYY-MM', 400);
    }

    const periodStart = firstDayOfMonth(month);

    const payrolls = await prisma.payroll.findMany({
      where: { periodMonth: periodStart },
      include: {
        teacherUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { teacherUser: { lastName: 'asc' } }
    });

    res.json({
      success: true,
      data: payrolls.map((p) => ({
        id: p.id,
        teacherUserId: p.teacherUserId,
        teacherUser: p.teacherUser,
        periodMonth: p.periodMonth,
        baseSalary: Number(p.baseSalary),
        bonus: Number(p.bonus),
        deduction: Number(p.deduction),
        netPay: Number(p.netPay),
        status: p.status,
        paidAt: p.paidAt,
        paymentMethod: p.paymentMethod,
        currency: p.currency,
        createdByUserId: p.createdByUserId,
        createdByUser: p.createdByUser,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const generatePayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401);

    const month = req.query.month as string | undefined;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new AppError('Query month is required and must be YYYY-MM', 400);
    }

    const periodStart = firstDayOfMonth(month);

    const teacherRole = await prisma.role.findFirst({ where: { name: 'teacher' } });
    if (!teacherRole) throw new AppError('Teacher role not found', 500);

    const teachers = await prisma.user.findMany({
      where: { roleId: teacherRole.id, status: 'active' },
      select: { id: true }
    });

    const existing = await prisma.payroll.findMany({
      where: { periodMonth: periodStart },
      select: { teacherUserId: true }
    });
    const existingTeacherIds = new Set(existing.map((e) => e.teacherUserId));

    const created: { id: string; teacherUserId: number }[] = [];
    for (const t of teachers) {
      if (existingTeacherIds.has(t.id)) continue;
      const payroll = await prisma.payroll.create({
        data: {
          teacherUserId: t.id,
          periodMonth: periodStart,
          baseSalary: new Decimal(0),
          bonus: new Decimal(0),
          deduction: new Decimal(0),
          netPay: new Decimal(0),
          status: 'DRAFT',
          currency: 'MMK',
          createdByUserId: userId
        }
      });
      created.push({ id: payroll.id, teacherUserId: t.id });
    }

    res.status(201).json({
      success: true,
      data: { month, created: created.length, payrolls: created }
    });
  } catch (error) {
    next(error);
  }
};

export const updatePayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = updatePayrollSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join(', ') || 'Validation failed', 400);
    }

    const existing = await prisma.payroll.findUnique({ where: { id } });
    if (!existing) throw new AppError('Payroll not found', 404);
    if (existing.status === 'PAID') {
      throw new AppError('Cannot update payroll that is already paid', 400);
    }

    const updateData: {
      baseSalary?: Decimal;
      bonus?: Decimal;
      deduction?: Decimal;
      netPay?: Decimal;
      status?: PayrollStatus;
    } = {};
    if (parsed.data.baseSalary !== undefined) updateData.baseSalary = new Decimal(parsed.data.baseSalary);
    if (parsed.data.bonus !== undefined) updateData.bonus = new Decimal(parsed.data.bonus);
    if (parsed.data.deduction !== undefined) updateData.deduction = new Decimal(parsed.data.deduction);
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status as PayrollStatus;

    if (updateData.baseSalary !== undefined || updateData.bonus !== undefined || updateData.deduction !== undefined) {
      const base = Number(updateData.baseSalary ?? existing.baseSalary);
      const bonus = Number(updateData.bonus ?? existing.bonus);
      const deduction = Number(updateData.deduction ?? existing.deduction);
      updateData.netPay = new Decimal(Math.max(0, base + bonus - deduction));
    }

    const payroll = await prisma.payroll.update({
      where: { id },
      data: updateData,
      include: { teacherUser: { select: { id: true, firstName: true, lastName: true, email: true } } }
    });

    res.json({
      success: true,
      data: {
        ...payroll,
        baseSalary: Number(payroll.baseSalary),
        bonus: Number(payroll.bonus),
        deduction: Number(payroll.deduction),
        netPay: Number(payroll.netPay)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const payPayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401);

    const { id } = req.params;
    const parsed = payPayrollSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join(', ') || 'Validation failed', 400);
    }

    const existing = await prisma.payroll.findUnique({ where: { id } });
    if (!existing) throw new AppError('Payroll not found', 404);
    if (existing.status === 'PAID') {
      throw new AppError('Payroll is already paid', 400);
    }

    const payrollCategoryId = await getOrCreatePayrollCategory();
    const netPay = Number(existing.netPay);
    const paidAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.payroll.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt,
          paymentMethod: parsed.data!.paymentMethod as PaymentMethod
        }
      });

      await tx.financeTransaction.create({
        data: {
          type: 'EXPENSE',
          categoryId: payrollCategoryId,
          amount: new Decimal(netPay),
          currency: existing.currency,
          paymentMethod: parsed.data!.paymentMethod as PaymentMethod,
          occurredAt: paidAt,
          referenceType: 'PAYROLL',
          referenceId: id,
          createdByUserId: userId
        }
      });
    });

    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: { teacherUser: { select: { id: true, firstName: true, lastName: true } } }
    });

    res.json({
      success: true,
      data: {
        ...payroll,
        baseSalary: payroll ? Number(payroll.baseSalary) : 0,
        bonus: payroll ? Number(payroll.bonus) : 0,
        deduction: payroll ? Number(payroll.deduction) : 0,
        netPay: payroll ? Number(payroll.netPay) : 0
      }
    });
  } catch (error) {
    next(error);
  }
};
