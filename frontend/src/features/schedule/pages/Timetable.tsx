import { useState } from 'react'
import { useTimetable, useCreateTimetableEntry, useUpdateTimetableEntry, useDeleteTimetableEntry, useUpdateTimetableStatus, TimetableEntry } from '../hooks/useTimetable'
import { Modal } from '../../../shared'
import TimetableForm, { TimetableFormData } from '../components/TimetableForm'
import { useAuthStore } from '../../auth/store/authStore'
import { Edit, Trash2, Calendar, Clock, User } from 'lucide-react'

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
  const updateStatusMutation = useUpdateTimetableStatus()

  const entries = data?.data || []

  const handleStatusChange = async (entryId: number, newStatus: string) => {
    await updateStatusMutation.mutateAsync({ id: entryId, status: newStatus })
  }

  const handleSubmit = async (formData: TimetableFormData) => {
    console.log('[Timetable Page] Form submitted:', formData)
    console.log('[Timetable Page] Editing entry:', editingEntry)
    
    if (editingEntry) {
      console.log('[Timetable Page] Updating entry with ID:', editingEntry.id)
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

  const formatTime = (timeString: string): string => {
    try {
      // Parse the time string (could be ISO date string like "1970-01-01T19:00:00.000Z")
      const date = new Date(timeString)
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // If not a valid date, try parsing as time string "HH:MM:SS" or "HH:MM"
        if (timeString.includes(':')) {
          const [hours, minutes] = timeString.split(':').map(Number)
          const tempDate = new Date()
          tempDate.setUTCHours(hours, minutes || 0, 0, 0)
          return formatTimeFromDate(tempDate, true)
        }
        return timeString
      }

      // Use UTC methods to avoid timezone conversion issues
      // Times are stored as UTC in the database (1970-01-01T19:00:00.000Z = 7:00 PM)
      return formatTimeFromDate(date, true)
    } catch (error) {
      // Fallback to original string if parsing fails
      return timeString
    }
  }

  const formatTimeFromDate = (date: Date, useUTC: boolean = false): string => {
    // Format to 12-hour format with am/pm
    // Use UTC methods to avoid timezone conversion when times are stored as UTC
    let hours = useUTC ? date.getUTCHours() : date.getHours()
    const minutes = useUTC ? date.getUTCMinutes() : date.getMinutes()
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12
    hours = hours ? hours : 12 // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes.toString()
    
    return `${hours}:${minutesStr}${ampm}`
  }

  const formatTimeRange = (startTime: string, endTime: string): string => {
    const start = formatTime(startTime)
    const end = formatTime(endTime)
    return `${start} to ${end}`
  }

  const convertTimeForForm = (timeString: string): string => {
    try {
      const date = new Date(timeString)
      if (isNaN(date.getTime())) {
        // If not a valid date, try parsing as time string "HH:MM:SS" or "HH:MM"
        if (timeString.includes(':')) {
          const [hours, minutes] = timeString.split(':')
          return `${hours}:${minutes || '00'}`
        }
        return timeString
      }
      // Convert to HH:MM format for time input
      // Use UTC methods to avoid timezone conversion when times are stored as UTC
      const hours = date.getUTCHours().toString().padStart(2, '0')
      const minutes = date.getUTCMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    } catch (error) {
      return timeString
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-gray-900">Timetable Management</h1>
        {!isTeacher && (
          <button className="btn btn-primary flex items-center gap-2" onClick={handleAdd}>
            <Calendar className="w-5 h-5" />
            Add Timetable Entry
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
          key={editingEntry?.id || 'new'} // Force remount when editing different entry
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
            startTime: convertTimeForForm(editingEntry.start_time),
            endTime: convertTimeForForm(editingEntry.end_time),
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
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No timetable entries found</div>
        ) : (
          <div className="overflow-x-auto">
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
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="font-bold text-gray-900">{entry.course_name}</td>
                    <td>
                      <span className={`badge ${getLevelColor(entry.level)}`}>
                        {entry.level}
                      </span>
                    </td>
                    <td className="font-medium text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {entry.day_of_week}
                      </div>
                    </td>
                    <td className="text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatTimeRange(entry.start_time, entry.end_time)}
                      </div>
                    </td>
                    <td className="text-gray-700">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {entry.teacher_name}
                      </div>
                    </td>
                    <td>
                      {isTeacher ? (
                        <select
                          value={entry.status}
                          onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                          disabled={updateStatusMutation.isPending}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            entry.status === 'active'
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              : entry.status === 'cancelled'
                              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <option value="active">Active</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="completed">Completed</option>
                        </select>
                      ) : (
                        <span className={`badge ${getStatusColor(entry.status)} capitalize`}>
                          {entry.status}
                        </span>
                      )}
                    </td>
                    <td>
                      {!isTeacher ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleteMutation.isPending}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 italic">View only</span>
                      )}
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

