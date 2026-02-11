import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '../../../shared/components/ui/Toast'
import * as financeApi from '../lib/api'
import type {
  FinanceType,
  PaymentMethod,
  TransactionFilters,
  PayrollStatus
} from '../lib/api'

// Categories
export function useFinanceCategories(type?: FinanceType) {
  return useQuery({
    queryKey: ['finance', 'categories', type],
    queryFn: () => financeApi.fetchFinanceCategories(type),
    retry: false
  })
}

export function useCreateFinanceCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof financeApi.createFinanceCategory>[0]) =>
      financeApi.createFinanceCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'categories'] })
      toast.success('Category created')
    },
    onError: (err: { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed')
    }
  })
}

export function useUpdateFinanceCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof financeApi.updateFinanceCategory>[1] }) =>
      financeApi.updateFinanceCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'categories'] })
      toast.success('Category updated')
    },
    onError: (err: { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed')
    }
  })
}

// Transactions
export function useFinanceTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['finance', 'transactions', filters],
    queryFn: () => financeApi.fetchFinanceTransactions(filters),
    retry: false
  })
}

export function useCreateFinanceTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof financeApi.createFinanceTransaction>[0]) =>
      financeApi.createFinanceTransaction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] })
      toast.success('Transaction created')
    },
    onError: (err: { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed')
    }
  })
}

export function useUpdateFinanceTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data
    }: {
      id: string
      data: Parameters<typeof financeApi.updateFinanceTransaction>[1]
    }) => financeApi.updateFinanceTransaction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] })
      toast.success('Transaction updated')
    },
    onError: (err: { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed')
    }
  })
}

export function useDeleteFinanceTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => financeApi.deleteFinanceTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] })
      toast.success('Transaction deleted')
    },
    onError: (err: { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed')
    }
  })
}

// Reports
export function useAllReport() {
  return useQuery({
    queryKey: ['finance', 'report', 'all'],
    queryFn: () => financeApi.fetchAllReport()
  })
}

export function useYearlyReport(year: string | null) {
  return useQuery({
    queryKey: ['finance', 'report', 'year', year],
    queryFn: () => financeApi.fetchYearlyReport(year!),
    enabled: !!year && /^\d{4}$/.test(year)
  })
}

export function useMonthlyReport(month: string | null) {
  return useQuery({
    queryKey: ['finance', 'report', 'month', month],
    queryFn: () => financeApi.fetchMonthlyReport(month!),
    enabled: !!month && /^\d{4}-\d{2}$/.test(month)
  })
}

export function useDailyReport(date: string | null) {
  return useQuery({
    queryKey: ['finance', 'report', 'day', date],
    queryFn: () => financeApi.fetchDailyReport(date!),
    enabled: !!date && /^\d{4}-\d{2}-\d{2}$/.test(date)
  })
}

// Books
export function useBooks(activeOnly = true) {
  return useQuery({
    queryKey: ['finance', 'books', activeOnly],
    queryFn: () => financeApi.fetchBooks(activeOnly)
  })
}

export function useCreateBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof financeApi.createBook>[0]) => financeApi.createBook(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'books'] })
      toast.success('Book created')
    },
    onError: (err: { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed')
    }
  })
}

export function useUpdateBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof financeApi.updateBook>[1] }) =>
      financeApi.updateBook(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'books'] })
      toast.success('Book updated')
    },
    onError: (err: { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed')
    }
  })
}

export function useDeleteBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => financeApi.deleteBook(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'books'] })
      toast.success('Book deactivated')
    },
    onError: (err: { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed')
    }
  })
}

// Book Sales
export function useBookSales(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['finance', 'book-sales', params],
    queryFn: () => financeApi.fetchBookSales(params)
  })
}

export function useCreateBookSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof financeApi.createBookSale>[0]) => financeApi.createBookSale(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['finance', 'book-sales'] })
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] })
      qc.invalidateQueries({ queryKey: ['finance', 'report'] })
      toast.success(
        data.costPriceMissingWarning
          ? 'Sale recorded (some books have no cost — profit may be overstated)'
          : 'Sale recorded'
      )
    },
    onError: (err: { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed')
    }
  })
}

export function useUpdateBookSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data
    }: {
      id: string
      data: Parameters<typeof financeApi.updateBookSale>[1]
    }) => financeApi.updateBookSale(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'book-sales'] })
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] })
      qc.invalidateQueries({ queryKey: ['finance', 'report'] })
      toast.success('Sale updated')
    },
    onError: (err: { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed')
    }
  })
}

// Payroll
export function usePayroll(month: string | null) {
  return useQuery({
    queryKey: ['finance', 'payroll', month],
    queryFn: () => financeApi.fetchPayroll(month!),
    enabled: !!month && /^\d{4}-\d{2}$/.test(month)
  })
}

export function useGeneratePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (month: string) => financeApi.generatePayroll(month),
    onSuccess: (_, month) => {
      qc.invalidateQueries({ queryKey: ['finance', 'payroll', month] })
      toast.success('Payroll generated')
    },
    onError: (err: { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed')
    }
  })
}

export function useUpdatePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data
    }: {
      id: string
      data: Partial<{ baseSalary: number; bonus: number; deduction: number; status: PayrollStatus }>
    }) => financeApi.updatePayroll(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'payroll'] })
      toast.success('Payroll updated')
    },
    onError: (err: { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed')
    }
  })
}

export function usePayPayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paymentMethod }: { id: string; paymentMethod: PaymentMethod }) =>
      financeApi.payPayroll(id, paymentMethod),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'payroll'] })
      toast.success('Marked as paid')
    },
    onError: (err: { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed')
    }
  })
}
