import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useEnrollments, useCreateEnrollment, useApproveEnrollment, Enrollment } from '../hooks/useEnrollments'
import Modal from '../components/Modal'
import EnrollmentForm, { EnrollmentFormData } from '../components/forms/EnrollmentForm'
import { useAuthStore } from '../store/authStore'

export default function Enrollments() {
  const { user } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Redirect teacher role to lectures (they don't have access to enrollments)
  if (user?.roleName === 'teacher') {
    return <Navigate to="/lectures" replace />
  }

  const { data, isLoading } = useEnrollments({ status: statusFilter || undefined, per_page: 100 })
  const createEnrollmentMutation = useCreateEnrollment()
  const approveEnrollmentMutation = useApproveEnrollment()

  const enrollments = data?.data || []

  const handleSubmit = async (formData: EnrollmentFormData) => {
    await createEnrollmentMutation.mutateAsync(formData)
    setIsModalOpen(false)
  }

  const handleApprove = async (id: number) => {
    await approveEnrollmentMutation.mutateAsync(id)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Enrollments</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + Create Enrollment
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Enrollment"
        size="lg"
      >
        <EnrollmentForm
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          isLoading={createEnrollmentMutation.isPending}
        />
      </Modal>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input max-w-xs"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Enrolled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td>
                    {enrollment.first_name} {enrollment.last_name}
                    <br />
                    <span className="text-xs text-gray-500">{enrollment.email}</span>
                  </td>
                  <td>{enrollment.course_title}</td>
                  <td>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(enrollment.status)}`}>
                      {enrollment.status}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        enrollment.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {enrollment.payment_status}
                    </span>
                  </td>
                  <td>{new Date(enrollment.enrolled_at).toLocaleDateString()}</td>
                  <td>
                    {enrollment.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(enrollment.id)}
                        disabled={approveEnrollmentMutation.isPending}
                        className="text-sm text-primary-600 hover:text-primary-700 mr-3 disabled:opacity-50"
                      >
                        {approveEnrollmentMutation.isPending ? 'Approving...' : 'Approve'}
                      </button>
                    )}
                    <Link
                      to={`/enrollments/${enrollment.id}`}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

