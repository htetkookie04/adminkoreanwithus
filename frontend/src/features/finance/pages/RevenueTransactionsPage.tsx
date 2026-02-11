import { useState } from 'react'
import { Modal } from '../../../shared'
import {
  useFinanceCategories,
  useFinanceTransactions,
  useCreateFinanceTransaction,
  useCreateFinanceCategory,
  useUpdateFinanceTransaction,
  useDeleteFinanceTransaction
} from '../hooks/useFinance'
import type { FinanceCategory, FinanceTransaction, PaymentMethod } from '../lib/api'
import { Plus, Filter, Pencil, Trash2 } from 'lucide-react'
import FinanceNav from '../components/FinanceNav'
import FinanceErrorMessage from '../components/FinanceErrorMessage'

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'KBZPAY', 'WAVEPAY', 'BANK', 'CARD']

function getErrorInfo(error: unknown): { message?: string; statusCode?: number } {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { error?: { message?: string }; message?: string }; status?: number } }).response
    return {
      message: res?.data?.error?.message ?? res?.data?.message ?? (error as Error).message,
      statusCode: res?.status
    }
  }
  return { message: error instanceof Error ? error.message : undefined }
}

export default function RevenueTransactionsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null)
  const [formCategoryName, setFormCategoryName] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formMethod, setFormMethod] = useState<PaymentMethod>('CASH')
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formNote, setFormNote] = useState('')

  const { data: categoriesData, isError: categoriesError, error: categoriesErr } = useFinanceCategories('REVENUE')
  const categories: FinanceCategory[] = categoriesData?.data ?? []

  const { data, isLoading, isError: transactionsError, error: transactionsErr } = useFinanceTransactions({
    type: 'REVENUE',
    from: from || undefined,
    to: to || undefined,
    categoryId: categoryId || undefined,
    paymentMethod: paymentMethod || undefined,
    pageSize: 50
  })
  const createMutation = useCreateFinanceTransaction()
  const createCategoryMutation = useCreateFinanceCategory()
  const updateMutation = useUpdateFinanceTransaction()
  const deleteMutation = useDeleteFinanceTransaction()

  const transactions = data?.data ?? []

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this revenue entry? This cannot be undone.')) return
    await deleteMutation.mutateAsync(id)
  }

  const handleEdit = (t: FinanceTransaction) => {
    setEditingTransaction(t)
    setFormCategoryName(t.category.name)
    setFormAmount(String(t.amount))
    setFormMethod(t.paymentMethod)
    setFormDate(new Date(t.occurredAt).toISOString().slice(0, 10))
    setFormNote(t.note ?? '')
    setIsModalOpen(true)
  }

  const hasError = categoriesError || transactionsError
  const errorInfo = categoriesError ? getErrorInfo(categoriesErr) : transactionsError ? getErrorInfo(transactionsErr) : null

  const handleOpenModal = () => {
    setEditingTransaction(null)
    setFormCategoryName('')
    setFormAmount('')
    setFormMethod('CASH')
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormNote('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(formAmount)
    const categoryName = formCategoryName.trim()
    if (!categoryName || isNaN(amount) || amount <= 0) return
    let categoryId = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase())?.id
    if (!categoryId) {
      const created = await createCategoryMutation.mutateAsync({
        type: 'REVENUE',
        name: categoryName
      })
      categoryId = created.data.id
    }
    if (editingTransaction) {
      await updateMutation.mutateAsync({
        id: editingTransaction.id,
        data: {
          categoryId,
          amount,
          paymentMethod: formMethod,
          occurredAt: new Date(formDate + 'T00:00:00').toISOString(),
          note: formNote || undefined
        }
      })
    } else {
      await createMutation.mutateAsync({
        type: 'REVENUE',
        categoryId,
        amount,
        paymentMethod: formMethod,
        occurredAt: new Date(formDate + 'T00:00:00').toISOString(),
        note: formNote || undefined
      })
    }
    setIsModalOpen(false)
    setEditingTransaction(null)
  }

  if (hasError && errorInfo) {
    return (
      <div className="space-y-6">
        <FinanceNav />
        <FinanceErrorMessage message={errorInfo.message} statusCode={errorInfo.statusCode} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FinanceNav />
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-gray-900">Revenue</h1>
        <button type="button" className="btn btn-primary flex items-center gap-2" onClick={handleOpenModal}>
          <Plus className="w-5 h-5" />
          Add Payment
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTransaction(null)
        }}
        title={editingTransaction ? 'Edit Revenue' : 'Add Revenue'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={formCategoryName}
              onChange={(e) => setFormCategoryName(e.target.value)}
              className="input"
              placeholder="e.g. Student Payments, Book Sales"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
            <select
              value={formMethod}
              onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
              className="input"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                createMutation.isPending ||
                createCategoryMutation.isPending ||
                updateMutation.isPending
              }
            >
              {updateMutation.isPending
                ? 'Saving...'
                : createMutation.isPending || createCategoryMutation.isPending
                  ? 'Saving...'
                  : editingTransaction
                    ? 'Update'
                    : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input max-w-[160px]"
          />
          <span className="text-gray-500">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input max-w-[160px]"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input max-w-[200px]"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="input max-w-[140px]"
        >
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Note</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="text-gray-600">
                      {new Date(t.occurredAt).toLocaleDateString(undefined, { dateStyle: 'short' })}
                    </td>
                    <td className="font-medium text-gray-900">{t.category.name}</td>
                    <td className="font-semibold text-green-700">{Number(t.amount).toLocaleString()}</td>
                    <td>{t.paymentMethod}</td>
                    <td className="text-gray-600 max-w-[200px] truncate">{t.note ?? '–'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(t)}
                          className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
