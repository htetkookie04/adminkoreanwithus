import { useState, useMemo } from 'react'
import { Modal } from '../../../shared'
import { useBooks, useBookSales, useCreateBookSale, useUpdateBookSale, useDeleteBookSale } from '../hooks/useFinance'
import type { Book, BookSale, PaymentMethod } from '../lib/api'
import { Plus, Filter, Pencil, Trash2 } from 'lucide-react'
import FinanceNav from '../components/FinanceNav'

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'KBZPAY', 'WAVEPAY', 'BANK', 'CARD']

interface SaleItemRow {
  id?: string
  bookId: string
  qty: number
  unitPrice: number
}

function computeProfit(items: SaleItemRow[], books: Book[]): { profit: number; costMissing: boolean } {
  let profit = 0
  let costMissing = false
  for (const i of items) {
    if (!i.bookId || i.qty <= 0) continue
    const book = books.find((b) => b.id === i.bookId)
    const cost = book?.costPrice ?? null
    if (cost === null) costMissing = true
    profit += (i.unitPrice - (cost ?? 0)) * i.qty
  }
  return { profit, costMissing }
}

export default function BookSalesPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<BookSale | null>(null)
  const [soldAt, setSoldAt] = useState(new Date().toISOString().slice(0, 10))
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [currency, setCurrency] = useState<'MMK' | 'KRW' | 'USD'>('MMK')
  const [items, setItems] = useState<SaleItemRow[]>([{ bookId: '', qty: 1, unitPrice: 0 }])

  const { data: booksData } = useBooks(true)
  const books: Book[] = booksData?.data ?? []
  const { data: salesData, isLoading } = useBookSales({
    from: from || undefined,
    to: to || undefined
  })
  const sales = salesData?.data ?? []
  const createMutation = useCreateBookSale()
  const updateMutation = useUpdateBookSale()
  const deleteMutation = useDeleteBookSale()

  const handleDeleteSale = async (sale: BookSale) => {
    if (!window.confirm('Delete this book sale? The linked finance entry will be removed. This cannot be undone.'))
      return
    await deleteMutation.mutateAsync(sale.id)
  }

  const totalAmount = useMemo(() => items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0), [items])
  const { profit: totalProfit, costMissing } = useMemo(
    () => computeProfit(items, books),
    [items, books]
  )

  const addRow = () => setItems((prev) => [...prev, { bookId: '', qty: 1, unitPrice: 0 }])
  const removeRow = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))
  const updateRow = (idx: number, field: keyof SaleItemRow, value: string | number) => {
    setItems((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      if (field === 'bookId') {
        const book = books.find((b) => b.id === value)
        if (book) next[idx].unitPrice = book.salePrice
      }
      return next
    })
  }

  const openNewModal = () => {
    setEditingSale(null)
    setSoldAt(new Date().toISOString().slice(0, 10))
    setCustomerName('')
    setPaymentMethod('CASH')
    setCurrency('MMK')
    setItems([{ bookId: '', qty: 1, unitPrice: 0 }])
    setIsModalOpen(true)
  }

  const openEditModal = (sale: BookSale) => {
    setEditingSale(sale)
    setSoldAt(new Date(sale.soldAt).toISOString().slice(0, 10))
    setCustomerName(sale.customerName ?? '')
    setPaymentMethod(sale.paymentMethod)
    setCurrency(sale.currency)
    setItems(
      sale.items.map((i) => ({
        id: i.id,
        bookId: i.bookId,
        qty: i.qty,
        unitPrice: i.unitPrice
      }))
    )
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingSale(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const valid = items.filter((i) => i.bookId && i.qty > 0 && i.unitPrice >= 0)
    if (valid.length === 0) return

    if (editingSale) {
      await updateMutation.mutateAsync({
        id: editingSale.id,
        data: {
          soldAt: new Date(soldAt + 'T00:00:00').toISOString(),
          customerName: customerName || null,
          paymentMethod,
          currency,
          items: valid.map((i) => ({
            ...(i.id && { id: i.id }),
            bookId: i.bookId,
            qty: i.qty,
            unitPrice: i.unitPrice
          }))
        }
      })
    } else {
      await createMutation.mutateAsync({
        soldAt: new Date(soldAt + 'T00:00:00').toISOString(),
        customerName: customerName || undefined,
        paymentMethod,
        currency,
        items: valid.map((i) => ({ bookId: i.bookId, qty: i.qty, unitPrice: i.unitPrice }))
      })
    }
    closeModal()
    if (!editingSale) setItems([{ bookId: '', qty: 1, unitPrice: 0 }])
  }

  const modalTitle = editingSale ? 'Edit Book Sale' : 'Record Book Sale'

  return (
    <div className="space-y-6">
      <FinanceNav />
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-gray-900">Book Sales</h1>
        <button type="button" className="btn btn-primary flex items-center gap-2" onClick={openNewModal}>
          <Plus className="w-5 h-5" />
          New Sale
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={modalTitle} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer (optional)</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'MMK' | 'KRW' | 'USD')}
                className="input"
              >
                <option value="MMK">MMK</option>
                <option value="KRW">KRW</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Items</label>
              <button type="button" onClick={addRow} className="text-sm text-pink-600 hover:underline">
                + Add row
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((row, idx) => (
                <div key={row.id ?? idx} className="flex gap-2 items-center">
                  <select
                    value={row.bookId}
                    onChange={(e) => updateRow(idx, 'bookId', e.target.value)}
                    className="input flex-1 min-w-0"
                  >
                    <option value="">Select book</option>
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} – {Number(b.salePrice).toLocaleString()}
                        {b.costPrice != null ? ` (cost: ${Number(b.costPrice).toLocaleString()})` : ' (no cost)'}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={row.qty}
                    onChange={(e) => updateRow(idx, 'qty', parseInt(e.target.value, 10) || 0)}
                    className="input w-20"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="input w-28"
                  />
                  <button type="button" onClick={() => removeRow(idx)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              <span className="font-semibold text-gray-700">
                Gross total: {totalAmount.toLocaleString()} {currency}
              </span>
              <span className="font-semibold text-green-700">
                Profit: {totalProfit.toLocaleString()} {currency}
              </span>
              {costMissing && (
                <span className="text-amber-600 font-medium">Some books have no cost — add cost for accurate profit.</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                (createMutation.isPending || updateMutation.isPending) || totalAmount <= 0
              }
            >
              {editingSale
                ? updateMutation.isPending
                  ? 'Saving...'
                  : 'Update Sale'
                : createMutation.isPending
                  ? 'Saving...'
                  : 'Save Sale'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="flex flex-wrap gap-4">
        <Filter className="w-5 h-5 text-gray-400 self-center" />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input max-w-[160px]" />
        <span className="text-gray-500 self-center">–</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input max-w-[160px]" />
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
                  <th>Customer</th>
                  <th>Gross Total</th>
                  <th>Profit Total</th>
                  <th>Method</th>
                  <th>Items</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="text-gray-600">
                      {new Date(s.soldAt).toLocaleDateString(undefined, { dateStyle: 'short' })}
                    </td>
                    <td>{s.customerName ?? '–'}</td>
                    <td className="font-semibold">{Number(s.totalAmount).toLocaleString()} {s.currency}</td>
                    <td className="font-semibold text-green-700">
                      {s.profitAmount != null ? Number(s.profitAmount).toLocaleString() : '–'} {s.currency}
                    </td>
                    <td>{s.paymentMethod}</td>
                    <td>{s.items.length} item(s)</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSale(s)}
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
