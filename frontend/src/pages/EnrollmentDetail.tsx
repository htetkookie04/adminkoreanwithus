import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useUpdateEnrollment, useApproveEnrollment } from '../hooks/useEnrollments'

export default function EnrollmentDetail() {
  const { id } = useParams()
  const [enrollment, setEnrollment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  const updateEnrollmentMutation = useUpdateEnrollment()
  const approveEnrollmentMutation = useApproveEnrollment()

  useEffect(() => {
    if (id) {
      fetchEnrollment()
    }
  }, [id])

  const fetchEnrollment = async () => {
    try {
      const response = await api.get(`/enrollments/${id}`)
      setEnrollment(response.data.data)
    } catch (error) {
      console.error('Failed to fetch enrollment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!id) return
    try {
      await approveEnrollmentMutation.mutateAsync(parseInt(id))
      await fetchEnrollment()
    } catch (error) {
      console.error('Failed to approve enrollment:', error)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return
    try {
      setIsUpdating(true)
      await updateEnrollmentMutation.mutateAsync({
        id: parseInt(id),
        data: { status: newStatus }
      })
      await fetchEnrollment()
    } catch (error) {
      console.error('Failed to update enrollment:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePaymentStatusChange = async (newPaymentStatus: string) => {
    if (!id) return
    try {
      setIsUpdating(true)
      await updateEnrollmentMutation.mutateAsync({
        id: parseInt(id),
        data: { paymentStatus: newPaymentStatus }
      })
      await fetchEnrollment()
    } catch (error) {
      console.error('Failed to update payment status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!enrollment) {
    return <div className="text-center py-12">Enrollment not found</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="mb-8">
        <Link to="/enrollments" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block">
          ← Back to Enrollments
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Enrollment Details</h1>
          {enrollment.status === 'pending' && (
            <button
              onClick={handleApprove}
              disabled={approveEnrollmentMutation.isPending}
              className="btn btn-primary"
            >
              {approveEnrollmentMutation.isPending ? 'Approving...' : 'Approve Enrollment'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Student Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {enrollment.first_name} {enrollment.last_name}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{enrollment.email}</dd>
            </div>
            {enrollment.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{enrollment.phone}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Course Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Course</dt>
              <dd className="mt-1 text-sm text-gray-900">{enrollment.course_title}</dd>
            </div>
            {enrollment.course_level && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Level</dt>
                <dd className="mt-1 text-sm text-gray-900">{enrollment.course_level}</dd>
              </div>
            )}
            {enrollment.location && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="mt-1 text-sm text-gray-900">{enrollment.location}</dd>
              </div>
            )}
            {enrollment.start_time && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Schedule</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(enrollment.start_time).toLocaleString()} -{' '}
                  {new Date(enrollment.end_time).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Enrollment Status</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <select
                  value={enrollment.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdating}
                  className="input"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
              <dd className="mt-1">
                <select
                  value={enrollment.payment_status || 'unpaid'}
                  onChange={(e) => handlePaymentStatusChange(e.target.value)}
                  disabled={isUpdating}
                  className="input"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Enrolled At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(enrollment.enrolled_at).toLocaleString()}
              </dd>
            </div>
            {enrollment.source && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Source</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{enrollment.source}</dd>
              </div>
            )}
          </dl>
        </div>

        {enrollment.notes && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Notes</h2>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{enrollment.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

