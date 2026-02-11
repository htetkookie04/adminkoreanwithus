import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { FinanceType } from '@prisma/client';

type ReportResult = {
  totalRevenue: number;
  totalExpense: number;
  totalPayroll: number;
  net: number;
  breakdownByCategory: { categoryId: string; name: string; type: FinanceType; total: number }[];
  breakdownByPaymentMethod: { paymentMethod: string; totalRevenue: number; totalExpense: number }[];
};

async function getPayrollTotalForRange(start: Date, end: Date): Promise<number> {
  const result = await prisma.payroll.aggregate({
    where: { periodMonth: { gte: start, lte: end } },
    _sum: { netPay: true }
  });
  return Number(result._sum.netPay ?? 0);
}

async function getPayrollTotalAll(): Promise<number> {
  const result = await prisma.payroll.aggregate({
    _sum: { netPay: true }
  });
  return Number(result._sum.netPay ?? 0);
}

async function getReportForRange(start: Date, end: Date): Promise<ReportResult> {
  const [txResult, totalPayroll] = await Promise.all([
    (async () => {
      const transactions = await prisma.financeTransaction.findMany({
        where: {
          isDeleted: false,
          occurredAt: { gte: start, lte: end }
        },
        include: { category: { select: { id: true, name: true, type: true } } }
      });
      return aggregateReport(transactions);
    })(),
    getPayrollTotalForRange(start, end)
  ]);
  return {
    ...txResult,
    totalPayroll,
    net: txResult.totalRevenue - txResult.totalExpense - totalPayroll
  };
}

async function getReportAll(): Promise<ReportResult> {
  const [txResult, totalPayroll] = await Promise.all([
    (async () => {
      const transactions = await prisma.financeTransaction.findMany({
        where: { isDeleted: false },
        include: { category: { select: { id: true, name: true, type: true } } }
      });
      return aggregateReport(transactions);
    })(),
    getPayrollTotalAll()
  ]);
  return {
    ...txResult,
    totalPayroll,
    net: txResult.totalRevenue - txResult.totalExpense - totalPayroll
  };
}

function aggregateReport(
  transactions: { amount: unknown; type: string; categoryId: string; paymentMethod: string; category: { id: string; name: string; type: FinanceType } }[]
): ReportResult {

  let totalRevenue = 0;
  let totalExpense = 0;
  const byCategory: Record<string, { categoryId: string; name: string; type: FinanceType; total: number }> = {};
  const byPaymentMethod: Record<string, { paymentMethod: string; totalRevenue: number; totalExpense: number }> = {};

  for (const t of transactions) {
    const amount = Number(t.amount);
    if (t.type === 'REVENUE') {
      totalRevenue += amount;
    } else {
      totalExpense += amount;
    }

    const catKey = t.categoryId;
    if (!byCategory[catKey]) {
      byCategory[catKey] = {
        categoryId: t.category.id,
        name: t.category.name,
        type: t.category.type,
        total: 0
      };
    }
    byCategory[catKey].total += amount;

    const methodKey = t.paymentMethod;
    if (!byPaymentMethod[methodKey]) {
      byPaymentMethod[methodKey] = { paymentMethod: methodKey, totalRevenue: 0, totalExpense: 0 };
    }
    if (t.type === 'REVENUE') {
      byPaymentMethod[methodKey].totalRevenue += amount;
    } else {
      byPaymentMethod[methodKey].totalExpense += amount;
    }
  }

  return {
    totalRevenue,
    totalExpense,
    totalPayroll: 0,
    net: totalRevenue - totalExpense,
    breakdownByCategory: Object.values(byCategory),
    breakdownByPaymentMethod: Object.values(byPaymentMethod)
  };
}

export const getAllReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await getReportAll();
    res.json({ success: true, data: { all: true, ...data } });
  } catch (error) {
    next(error);
  }
};

export const getYearlyReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const year = req.query.year as string;
    if (!year || !/^\d{4}$/.test(year)) {
      throw new AppError('Query year is required and must be YYYY', 400);
    }
    const y = Number(year);
    const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    const data = await getReportForRange(start, end);
    res.json({ success: true, data: { year, ...data } });
  } catch (error) {
    next(error);
  }
};

export const getMonthlyReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = req.query.month as string;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new AppError('Query month is required and must be YYYY-MM', 400);
    }

    const [year, monthNum] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

    const data = await getReportForRange(start, end);
    res.json({ success: true, data: { month, ...data } });
  } catch (error) {
    next(error);
  }
};

export const getDailyReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const date = req.query.date as string;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError('Query date is required and must be YYYY-MM-DD', 400);
    }

    const [y, m, d] = date.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
    const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    const [txResult, totalPayroll] = await Promise.all([
      (async () => {
        const transactions = await prisma.financeTransaction.findMany({
          where: {
            isDeleted: false,
            occurredAt: { gte: start, lte: end }
          },
          include: { category: { select: { id: true, name: true, type: true } } }
        });
        const result = aggregateReport(transactions);
        return result;
      })(),
      getPayrollTotalForRange(monthStart, monthEnd)
    ]);
    const data: ReportResult = {
      ...txResult,
      totalPayroll,
      net: txResult.totalRevenue - txResult.totalExpense - totalPayroll
    };
    res.json({ success: true, data: { date, ...data } });
  } catch (error) {
    next(error);
  }
};
