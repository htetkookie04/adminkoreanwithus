import { useState } from 'react'
import { Modal } from '../../../shared'
import { usePayroll, useGeneratePayroll, useUpdatePayroll, usePayPayroll } from '../hooks/useFinance'
import type { Payroll, PaymentMethod } from '../lib/api'
import { Edit, DollarSign } from 'lucide-react'
import FinanceNav from '../components/FinanceNav'

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'KBZPAY', 'WAVEPAY', 'BANK', 'CARD']

function getMonthOption() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export default function PayrollPage() {
  const [month, setMonth] = useState(getMonthOption())
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [selected, setSelected] = useState<Payroll | null>(null)
  const [editBase, setEditBase] = useState('')
  const [editBonus, setEditBonus] = useState('')
  const [editDeduction, setEditDeduction] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BANK')

  const { data, isLoading } = usePayroll(month)
  const payrolls: Payroll[] = data?.data ?? []
  const generateMutation = useGeneratePayroll()
  const updateMutation = useUpdatePayroll()
  const payMutation = usePayPayroll()

  const openEdit = (p: Payroll) => {
    setSelected(p)
    setEditBase(String(p.baseSalary))
    setEditBonus(String(p.bonus))
    setEditDeduction(String(p.deduction))
    setIsEditOpen(true)
  }

  const openPay = (p: Payroll) => {
    setSelected(p)
    setPayMethod('BANK')
    setIsPayOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const base = parseFloat(editBase)
    const bonus = parseFloat(editBonus)
    const deduction = parseFloat(editDeduction)
    if (isNaN(base) || base < 0) return
    await updateMutation.mutateAsync({
      id: selected.id,
      data: {
        baseSalary: base,
        bonus: isNaN(bonus) ? 0 : bonus,
        deduction: isNaN(deduction) ? 0 : deduction
      }
    })
    setIsEditOpen(false)
    setSelected(null)
  }

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    await payMutation.mutateAsync({ id: selected.id, paymentMethod: payMethod })
    setIsPayOpen(false)
    setSelected(null)
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <FinanceNav />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-4xl font-bold text-gray-900">Payroll</h1>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input max-w-[180px]"
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => generateMutation.mutate(month)}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Generating...' : 'Generate payroll'}
          </button>
        </div>
      </div>

      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setSelected(null) }} title="Edit Payroll" size="md">
        {selected && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <p className="text-gray-600">
              {selected.teacherUser?.firstName} {selected.teacherUser?.lastName}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base salary</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editBase}
                onChange={(e) => setEditBase(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bonus</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editBonus}
                onChange={(e) => setEditBonus(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deduction</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editDeduction}
                onChange={(e) => setEditDeduction(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={isPayOpen} onClose={() => { setIsPayOpen(false); setSelected(null) }} title="Mark as paid" size="sm">
        {selected && (
          <form onSubmit={handlePaySubmit} className="space-y-4">
            <p className="text-gray-600">
              {selected.teacherUser?.firstName} {selected.teacherUser?.lastName} – {Number(selected.netPay).toLocaleString()} {selected.currency}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="input"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setIsPayOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={payMutation.isPending}>
                Mark paid
              </button>
            </div>
          </form>
        )}
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
                  <th>Teacher</th>
                  <th>Base</th>
                  <th>Bonus</th>
                  <th>Deduction</th>
                  <th>Net pay</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="font-medium text-gray-900">
                      {p.teacherUser?.firstName} {p.teacherUser?.lastName}
                    </td>
                    <td>{Number(p.baseSalary).toLocaleString()}</td>
                    <td>{Number(p.bonus).toLocaleString()}</td>
                    <td>{Number(p.deduction).toLocaleString()}</td>
                    <td className="font-semibold">{Number(p.netPay).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${statusColor(p.status)}`}>{p.status}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {p.status !== 'PAID' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openPay(p)}
                              disabled={payMutation.isPending}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Mark paid"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          </>
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
