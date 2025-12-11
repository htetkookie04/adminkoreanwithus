import { useState } from 'react'
import { useTimetable, useCreateTimetableEntry, useUpdateTimetableEntry, useDeleteTimetableEntry, TimetableEntry } from '../hooks/useTimetable'
import Modal from '../components/Modal'
import TimetableForm, { TimetableFormData } from '../components/forms/TimetableForm'
import { useAuthStore } from '../store/authStore'

export default function Timetable() {
  const { user } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState('')
  const [dayFilter, setDayFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null)

  const isTeacher = user?.roleName === 'teacher'

  const { data, isLoading } = useTimetable({
    status: statusFilter || undefined,
    dayOfWeek: dayFilter || undefined
  })
  const createMutation = useCreateTimetableEntry()
  const updateMutation = useUpdateTimetableEntry()
  const deleteMutation = useDeleteTimetableEntry()

  const entries = data?.data || []

  const handleSubmit = async (formData: TimetableFormData) => {
    if (editingEntry) {
      await updateMutation.mutateAsync({ id: editingEntry.id, data: formData })
    } else {
      await createMutation.mutateAsync(formData)
    }
    setIsModalOpen(false)
    setEditingEntry(null)
  }

  const handleEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this timetable entry?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const handleAdd = () => {
    setEditingEntry(null)
    setIsModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner':
        return 'bg-blue-100 text-blue-800'
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'Advanced':
        return 'bg-purple-100 text-purple-800'
      case 'TOPIK':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Timetable Management</h1>
        {!isTeacher && (
          <button className="btn btn-primary" onClick={handleAdd}>
            + Add Timetable Entry
          </button>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingEntry(null)
        }}
        title={editingEntry ? 'Edit Timetable Entry' : 'Add New Timetable Entry'}
        size="md"
      >
        <TimetableForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false)
            setEditingEntry(null)
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
          initialData={editingEntry ? {
            courseName: editingEntry.course_name,
            level: editingEntry.level as any,
            dayOfWeek: editingEntry.day_of_week as any,
            startTime: editingEntry.start_time,
            endTime: editingEntry.end_time,
            teacherName: editingEntry.teacher_name,
            status: editingEntry.status as any
          } : undefined}
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
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value)}
          className="input max-w-xs"
        >
          <option value="">All Days</option>
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
          <option value="Saturday">Saturday</option>
          <option value="Sunday">Sunday</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No timetable entries found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Level</th>
                <th>Day</th>
                <th>Time</th>
                <th>Teacher</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="font-medium">{entry.course_name}</td>
                  <td>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getLevelColor(entry.level)}`}>
                      {entry.level}
                    </span>
                  </td>
                  <td>{entry.day_of_week}</td>
                  <td>
                    {entry.start_time} - {entry.end_time}
                  </td>
                  <td>{entry.teacher_name}</td>
                  <td>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(entry.status)}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td>
                    {!isTeacher && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleteMutation.isPending}
                          className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
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

