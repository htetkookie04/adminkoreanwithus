import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../shared/lib/api'

interface Inquiry {
  id: number
  name: string
  email: string
  subject: string
  message: string
  status: string
  priority: string
  created_at: string
}

export default function Inquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('new')

  useEffect(() => {
    fetchInquiries()
  }, [statusFilter])

  const fetchInquiries = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) {
        params.append('status', statusFilter)
      }
      const response = await api.get(`/inquiries?${params}`)
      setInquiries(response.data.data)
    } catch (error) {
      console.error('Failed to fetch inquiries:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'replied':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inquiries</h1>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input max-w-xs"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="pending">Pending</option>
          <option value="replied">Replied</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : inquiries.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">No inquiries found.</p>
          </div>
        ) : (
          inquiries.map((inquiry) => (
            <div key={inquiry.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{inquiry.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(inquiry.status)}`}>
                      {inquiry.status}
                    </span>
                    {inquiry.priority === 'high' && (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                        High Priority
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{inquiry.email}</p>
                  {inquiry.subject && (
                    <p className="font-medium text-gray-900 mb-2">{inquiry.subject}</p>
                  )}
                  <p className="text-sm text-gray-700 line-clamp-2">{inquiry.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(inquiry.created_at).toLocaleString()}
                  </p>
                </div>
                <Link
                  to={`/inquiries/${inquiry.id}`}
                  className="ml-4 text-primary-600 hover:text-primary-700 text-sm"
                >
                  View →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

