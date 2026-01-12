import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useToggleUserStatus, User } from '../hooks/useUsers'
import { Modal } from '../../../shared'
import UserForm, { UserFormData } from '../components/UserForm'
import { Plus, Search, Eye, Edit, UserX, UserCheck, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Users() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const { data, isLoading } = useUsers({ page, per_page: 20, q: search || undefined })
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()
  const toggleStatusMutation = useToggleUserStatus()

  const users = data?.data || []
  const totalPages = data?.pagination?.total_pages || 1

  const handleSubmit = async (formData: UserFormData) => {
    if (editingUser) {
      await updateUserMutation.mutateAsync({ id: editingUser.id, data: formData })
    } else {
      await createUserMutation.mutateAsync(formData)
    }
    setIsModalOpen(false)
    setEditingUser(null)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone and will remove the user from the database.')) {
      await deleteUserMutation.mutateAsync(id)
    }
  }

  const handleToggleStatus = async (user: User) => {
    await toggleStatusMutation.mutateAsync({ id: user.id, currentStatus: user.status })
  }

  const handleAdd = () => {
    setEditingUser(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-gray-900">Users</h1>
        <button className="btn btn-primary flex items-center gap-2" onClick={handleAdd}>
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUser ? 'Edit User' : 'Add New User'}
        size="md"
      >
        <UserForm
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          isLoading={editingUser ? updateUserMutation.isPending : createUserMutation.isPending}
          initialData={editingUser ? {
            email: editingUser.email,
            firstName: editingUser.first_name,
            lastName: editingUser.last_name,
            phone: editingUser.phone,
            roleId: editingUser.role_id,
            status: editingUser.status as 'active' | 'suspended' | 'archived'
          } : undefined}
        />
      </Modal>

      {/* Search */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search users by name or email..."
          className="input pl-11"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
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
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="font-semibold text-gray-900">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="text-gray-600">{user.email}</td>
                    <td>
                      <span className="badge badge-pink capitalize">
                        {user.role_name}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="text-gray-600">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/users/${user.id}`}
                          className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={toggleStatusMutation.isPending}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                            user.status === 'active'
                              ? 'text-orange-600 hover:bg-orange-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {user.status === 'active' ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deleteUserMutation.isPending}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm font-semibold text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

