import api from '../../../shared/lib/api'

const base = 'v1'

export type FinanceType = 'REVENUE' | 'EXPENSE'
export type PaymentMethod = 'CASH' | 'KBZPAY' | 'WAVEPAY' | 'BANK' | 'CARD'
export type Currency = 'MMK' | 'KRW' | 'USD'
export type PayrollStatus = 'DRAFT' | 'CONFIRMED' | 'PAID'

export interface FinanceCategory {
  id: string
  type: FinanceType
  name: string
  parentId: string | null
  parent?: { id: string; name: string } | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface FinanceTransaction {
  id: string
  type: FinanceType
  categoryId: string
  category: { id: string; name: string; type: FinanceType }
  amount: number
  currency: Currency
  paymentMethod: PaymentMethod
  occurredAt: string
  note: string | null
  referenceType: string | null
  referenceId: string | null
  createdByUserId: number
  createdByUser?: { id: number; firstName: string | null; lastName: string | null; email: string }
  createdAt: string
  updatedAt: string
}

export interface FinanceReport {
  month?: string
  year?: string
  date?: string
  totalRevenue: number
  totalExpense: number
  totalPayroll: number
  net: number
  breakdownByCategory: { categoryId: string; name: string; type: FinanceType; total: number }[]
  breakdownByPaymentMethod: { paymentMethod: string; totalRevenue: number; totalExpense: number }[]
}

/** @deprecated Use FinanceReport */
export type MonthlyReport = FinanceReport

export interface Book {
  id: string
  title: string
  sku: string | null
  salePrice: number
  costPrice: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BookSaleItem {
  id: string
  bookId: string
  book: { id: string; title: string }
  qty: number
  unitPrice: number
  lineTotal?: number
}

export interface BookSale {
  id: string
  soldAt: string
  customerName: string | null
  paymentMethod: PaymentMethod
  currency: Currency
  totalAmount: number
  profitAmount: number | null
  createdByUserId: number
  createdByUser?: { id: number; firstName: string | null; lastName: string | null }
  items: BookSaleItem[]
  createdAt: string
  updatedAt: string
}

export interface Payroll {
  id: string
  teacherUserId: number
  teacherUser: { id: number; firstName: string | null; lastName: string | null; email: string }
  periodMonth: string
  baseSalary: number
  bonus: number
  deduction: number
  netPay: number
  status: PayrollStatus
  paidAt: string | null
  paymentMethod: PaymentMethod | null
  currency: Currency
  createdByUserId: number
  createdByUser?: { id: number; firstName: string | null; lastName: string | null }
  createdAt: string
  updatedAt: string
}

// Categories
export async function fetchFinanceCategories(type?: FinanceType) {
  const params = type ? `?type=${type}` : ''
  const res = await api.get<{ success: boolean; data: FinanceCategory[] }>(`${base}/finance/categories${params}`)
  return res.data
}

export async function createFinanceCategory(data: {
  type: FinanceType
  name: string
  parentId?: string | null
  isActive?: boolean
}) {
  const res = await api.post<{ success: boolean; data: FinanceCategory }>(`${base}/finance/categories`, data)
  return res.data
}

export async function updateFinanceCategory(
  id: string,
  data: { name?: string; parentId?: string | null; isActive?: boolean }
) {
  const res = await api.patch<{ success: boolean; data: FinanceCategory }>(`${base}/finance/categories/${id}`, data)
  return res.data
}

// Transactions
export interface TransactionFilters {
  type?: FinanceType
  from?: string
  to?: string
  categoryId?: string
  paymentMethod?: PaymentMethod
  q?: string
  page?: number
  pageSize?: number
}

export async function fetchFinanceTransactions(filters: TransactionFilters = {}) {
  const sp = new URLSearchParams()
  if (filters.type) sp.append('type', filters.type)
  if (filters.from) sp.append('from', filters.from)
  if (filters.to) sp.append('to', filters.to)
  if (filters.categoryId) sp.append('categoryId', filters.categoryId)
  if (filters.paymentMethod) sp.append('paymentMethod', filters.paymentMethod)
  if (filters.q) sp.append('q', filters.q)
  if (filters.page) sp.append('page', String(filters.page))
  if (filters.pageSize) sp.append('pageSize', String(filters.pageSize))
  const res = await api.get<{
    success: boolean
    data: FinanceTransaction[]
    pagination: { page: number; pageSize: number; total: number; totalPages: number }
  }>(`${base}/finance/transactions?${sp}`)
  return res.data
}

export async function createFinanceTransaction(data: {
  type: FinanceType
  categoryId: string
  amount: number
  currency?: Currency
  paymentMethod: PaymentMethod
  occurredAt: string
  note?: string | null
  referenceType?: string | null
  referenceId?: string | null
}) {
  const res = await api.post<{ success: boolean; data: FinanceTransaction }>(`${base}/finance/transactions`, data)
  return res.data
}

export async function updateFinanceTransaction(
  id: string,
  data: Partial<{
    categoryId: string
    amount: number
    currency: Currency
    paymentMethod: PaymentMethod
    occurredAt: string
    note: string | null
    referenceType: string | null
    referenceId: string | null
  }>
) {
  const res = await api.patch<{ success: boolean; data: FinanceTransaction }>(
    `${base}/finance/transactions/${id}`,
    data
  )
  return res.data
}

export async function deleteFinanceTransaction(id: string) {
  const res = await api.delete<{ success: boolean; data: { id: string; deleted: boolean } }>(
    `${base}/finance/transactions/${id}`
  )
  return res.data
}

// Reports
export async function fetchAllReport() {
  const res = await api.get<{ success: boolean; data: FinanceReport }>(`${base}/finance/reports/all`)
  return res.data
}

export async function fetchYearlyReport(year: string) {
  const res = await api.get<{ success: boolean; data: FinanceReport }>(
    `${base}/finance/reports/yearly?year=${encodeURIComponent(year)}`
  )
  return res.data
}

export async function fetchMonthlyReport(month: string) {
  const res = await api.get<{ success: boolean; data: FinanceReport }>(
    `${base}/finance/reports/monthly?month=${encodeURIComponent(month)}`
  )
  return res.data
}

export async function fetchDailyReport(date: string) {
  const res = await api.get<{ success: boolean; data: FinanceReport }>(
    `${base}/finance/reports/daily?date=${encodeURIComponent(date)}`
  )
  return res.data
}

// Books
export async function fetchBooks(activeOnly = true) {
  const params = activeOnly ? '' : '?active=false'
  const res = await api.get<{ success: boolean; data: Book[] }>(`${base}/books${params}`)
  return res.data
}

export async function createBook(data: {
  title: string
  sku?: string | null
  salePrice: number
  costPrice?: number | null
  isActive?: boolean
}) {
  const res = await api.post<{ success: boolean; data: Book }>(`${base}/books`, data)
  return res.data
}

export async function updateBook(
  id: string,
  data: Partial<{ title: string; sku: string | null; salePrice: number; costPrice: number | null; isActive: boolean }>
) {
  const res = await api.patch<{ success: boolean; data: Book }>(`${base}/books/${id}`, data)
  return res.data
}

export async function deleteBook(id: string) {
  const res = await api.delete<{ success: boolean; data: { id: string; deactivated: boolean } }>(`${base}/books/${id}`)
  return res.data
}

// Book Sales
export async function fetchBookSales(params?: { from?: string; to?: string }) {
  const sp = new URLSearchParams()
  if (params?.from) sp.append('from', params.from)
  if (params?.to) sp.append('to', params.to)
  const q = sp.toString()
  const res = await api.get<{ success: boolean; data: BookSale[] }>(
    `${base}/book-sales${q ? `?${q}` : ''}`
  )
  return res.data
}

export async function createBookSale(data: {
  soldAt: string
  customerName?: string | null
  paymentMethod: PaymentMethod
  currency?: Currency
  items: { bookId: string; qty: number; unitPrice: number }[]
}) {
  const res = await api.post<{
    success: boolean
    data: BookSale
    costPriceMissingWarning?: boolean
  }>(`${base}/book-sales`, data)
  return res.data
}

export type UpdateBookSalePayload = {
  soldAt?: string
  customerName?: string | null
  paymentMethod?: PaymentMethod
  currency?: Currency
  items: { id?: string; bookId: string; qty: number; unitPrice: number }[]
}

export async function updateBookSale(id: string, data: UpdateBookSalePayload) {
  const res = await api.patch<{ success: boolean; data: BookSale }>(`${base}/book-sales/${id}`, data)
  return res.data
}

// Payroll
export async function fetchPayroll(month: string) {
  const res = await api.get<{ success: boolean; data: Payroll[] }>(
    `${base}/payroll?month=${encodeURIComponent(month)}`
  )
  return res.data
}

export async function generatePayroll(month: string) {
  const res = await api.post<{ success: boolean; data: { month: string; created: number; payrolls: unknown[] } }>(
    `${base}/payroll/generate?month=${encodeURIComponent(month)}`
  )
  return res.data
}

export async function updatePayroll(
  id: string,
  data: Partial<{ baseSalary: number; bonus: number; deduction: number; status: PayrollStatus }>
) {
  const res = await api.patch<{ success: boolean; data: Payroll }>(`${base}/payroll/${id}`, data)
  return res.data
}

export async function payPayroll(id: string, paymentMethod: PaymentMethod) {
  const res = await api.post<{ success: boolean; data: Payroll }>(`${base}/payroll/${id}/pay`, {
    paymentMethod
  })
  return res.data
}
