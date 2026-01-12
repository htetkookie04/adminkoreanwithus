import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useEnrollments, useCreateEnrollment, useApproveEnrollment, useDeleteEnrollment, Enrollment } from '../hooks/useEnrollments'
import { Modal } from '../../../shared'
import EnrollmentForm, { EnrollmentFormData } from '../components/EnrollmentForm'
import { useAuthStore } from '../../auth/store/authStore'
import { Plus, Filter, Eye, CheckCircle, Trash2 } from 'lucide-react'

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
  const deleteEnrollmentMutation = useDeleteEnrollment()

  const enrollments = data?.data || []

  const handleSubmit = async (formData: EnrollmentFormData) => {
    await createEnrollmentMutation.mutateAsync(formData)
    setIsModalOpen(false)
  }

  const handleApprove = async (id: number) => {
    await approveEnrollmentMutation.mutateAsync(id)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to permanently delete this enrollment? This action cannot be undone and will remove the enrollment from the database.')) {
      await deleteEnrollmentMutation.mutateAsync(id)
    }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-gray-900">Enrollments</h1>
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-5 h-5" />
          Create Enrollment
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
      <div className="flex gap-4">
        <div className="relative max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input pl-11 appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  <tr key={enrollment.id} className="hover:bg-gray-50 transition-colors">
                    <td>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {enrollment.first_name} {enrollment.last_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{enrollment.email}</p>
                      </div>
                    </td>
                    <td className="font-medium text-gray-900">{enrollment.course_title}</td>
                    <td>
                      <span className={`badge ${getStatusColor(enrollment.status)}`}>
                        {enrollment.status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          enrollment.payment_status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {enrollment.payment_status}
                      </span>
                    </td>
                    <td className="text-gray-600">{new Date(enrollment.enrolled_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {enrollment.status === 'pending' && (
                          <button
                            onClick={() => handleApprove(enrollment.id)}
                            disabled={approveEnrollmentMutation.isPending}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <Link
                          to={`/enrollments/${enrollment.id}`}
                          className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(enrollment.id)}
                          disabled={deleteEnrollmentMutation.isPending}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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

