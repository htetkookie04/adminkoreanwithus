import { useState } from 'react'
import { Modal } from '../../../shared'
import { useBooks, useCreateBook, useUpdateBook, useDeleteBook } from '../hooks/useFinance'
import type { Book } from '../lib/api'
import { Plus, Edit, Trash2 } from 'lucide-react'
import FinanceNav from '../components/FinanceNav'

export default function BooksPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Book | null>(null)
  const [title, setTitle] = useState('')
  const [sku, setSku] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [costPrice, setCostPrice] = useState('')

  const { data, isLoading } = useBooks(false)
  const books: Book[] = data?.data ?? []
  const createMutation = useCreateBook()
  const updateMutation = useUpdateBook()
  const deleteMutation = useDeleteBook()

  const openCreate = () => {
    setEditing(null)
    setTitle('')
    setSku('')
    setSalePrice('')
    setCostPrice('')
    setIsModalOpen(true)
  }

  const openEdit = (b: Book) => {
    setEditing(b)
    setTitle(b.title)
    setSku(b.sku ?? '')
    setSalePrice(String(b.salePrice))
    setCostPrice(b.costPrice != null ? String(b.costPrice) : '')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const sale = parseFloat(salePrice)
    const cost = costPrice === '' ? null : parseFloat(costPrice)
    if (isNaN(sale) || sale < 0) return
    if (editing) {
      await updateMutation.mutateAsync({
        id: editing.id,
        data: { title, sku: sku || null, salePrice: sale, costPrice: cost ?? undefined, isActive: true }
      })
    } else {
      await createMutation.mutateAsync({
        title,
        sku: sku || null,
        salePrice: sale,
        costPrice: cost ?? undefined
      })
    }
    setIsModalOpen(false)
  }

  const handleDelete = async (b: Book) => {
    if (!window.confirm(`Deactivate "${b.title}"?`)) return
    await deleteMutation.mutateAsync(b.id)
  }

  return (
    <div className="space-y-6">
      <FinanceNav />
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-gray-900">Books</h1>
        <button type="button" className="btn btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus className="w-5 h-5" />
          Add Book
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Book' : 'Add Book'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU (optional)</label>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sale price</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost price (optional)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
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
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? (updateMutation.isPending ? 'Saving...' : 'Save') : createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

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
                  <th>Title</th>
                  <th>SKU</th>
                  <th>Sale price</th>
                  <th>Cost price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="font-medium text-gray-900">{b.title}</td>
                    <td className="text-gray-600">{b.sku ?? '–'}</td>
                    <td>{Number(b.salePrice).toLocaleString()}</td>
                    <td>{b.costPrice != null ? Number(b.costPrice).toLocaleString() : '–'}</td>
                    <td>
                      <span className={`badge ${b.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {b.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(b)}
                          className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {b.isActive && (
                          <button
                            type="button"
                            onClick={() => handleDelete(b)}
                            disabled={deleteMutation.isPending}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
