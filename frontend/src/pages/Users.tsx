import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useToggleUserStatus, User } from '../hooks/useUsers'
import Modal from '../components/Modal'
import UserForm, { UserFormData } from '../components/forms/UserForm'

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
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <button className="btn btn-primary" onClick={handleAdd}>
          + Add User
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
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search users..."
          className="input max-w-md"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
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
                <tr key={user.id}>
                  <td>
                    {user.first_name} {user.last_name}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                      {user.role_name}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/users/${user.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={toggleStatusMutation.isPending}
                        className={`text-sm disabled:opacity-50 ${
                          user.status === 'active'
                            ? 'text-orange-600 hover:text-orange-700'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                      >
                        {toggleStatusMutation.isPending
                          ? 'Updating...'
                          : user.status === 'active'
                          ? 'Deactivate'
                          : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={deleteUserMutation.isPending}
                        className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
                      >
                        {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

