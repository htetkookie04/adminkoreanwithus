import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import CourseForm, { CourseFormData } from '../components/forms/CourseForm'
import ScheduleForm, { ScheduleFormData } from '../components/forms/ScheduleForm'
import Modal from '../components/Modal'
import { useSchedules, useCreateSchedule, useUpdateSchedule, useDeleteSchedule, Schedule } from '../hooks/useSchedules'
import { useDeleteCourse } from '../hooks/useCourses'
import { useAuthStore } from '../store/authStore'

export default function CourseDetail() {
  const { user } = useAuthStore()
  const { id } = useParams()
  const courseId = id ? parseInt(id) : 0
  const navigate = useNavigate()
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)

  const isAdmin = user?.roleName === 'admin' || user?.roleName === 'super_admin'
  const isTeacher = user?.roleName === 'teacher'

  const deleteCourseMutation = useDeleteCourse()
  const { data: schedulesData, isLoading: schedulesLoading } = useSchedules(courseId)
  const createScheduleMutation = useCreateSchedule()
  const updateScheduleMutation = useUpdateSchedule()
  const deleteScheduleMutation = useDeleteSchedule()
  const schedules = schedulesData?.data || []

  useEffect(() => {
    if (id) {
      fetchCourse()
    }
  }, [id])

  const fetchCourse = async () => {
    try {
      const response = await api.get(`/courses/${id}`)
      setCourse(response.data.data)
    } catch (error) {
      console.error('Failed to fetch course:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCourse = async (formData: CourseFormData) => {
    try {
      setIsUpdating(true)
      await api.put(`/courses/${id}`, formData)
      await fetchCourse()
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Failed to update course:', error)
      alert('Failed to update course')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateSchedule = async (formData: ScheduleFormData) => {
    if (!courseId) {
      console.error('Course ID is missing')
      return
    }
    try {
      console.log('Creating schedule:', { courseId, formData })
      await createScheduleMutation.mutateAsync({ courseId, data: formData })
      setIsScheduleModalOpen(false)
    } catch (error) {
      console.error('Failed to create schedule:', error)
      // Error is already handled by the mutation's onError
    }
  }

  const handleUpdateSchedule = async (formData: ScheduleFormData) => {
    if (!courseId || !editingSchedule) {
      console.error('Course ID or Schedule ID is missing')
      return
    }
    try {
      await updateScheduleMutation.mutateAsync({
        courseId,
        scheduleId: editingSchedule.id,
        data: formData
      })
      setIsScheduleModalOpen(false)
      setEditingSchedule(null)
    } catch (error) {
      console.error('Failed to update schedule:', error)
      // Error is already handled by the mutation's onError
    }
  }

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!courseId) {
      console.error('Course ID is missing')
      return
    }
    if (window.confirm('Are you sure you want to permanently delete this schedule? This action cannot be undone.')) {
      try {
        await deleteScheduleMutation.mutateAsync({ courseId, scheduleId })
      } catch (error) {
        console.error('Failed to delete schedule:', error)
        // Error is already handled by the mutation's onError
      }
    }
  }

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setIsScheduleModalOpen(true)
  }

  const handleCancelSchedule = () => {
    setIsScheduleModalOpen(false)
    setEditingSchedule(null)
  }

  const handleDeleteCourse = async () => {
    if (!courseId) return
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this course and all related schedules, enrollments, and data? This action cannot be undone.'
    )
    if (!confirmed) return

    try {
      await deleteCourseMutation.mutateAsync(courseId)
      navigate('/courses')
    } catch (error) {
      console.error('Failed to delete course:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!course) {
    return <div className="text-center py-12">Course not found</div>
  }

  return (
    <div>
      <div className="mb-8">
        <Link to="/courses" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block">
          ← Back to Courses
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
          {!isTeacher && (
            <div className="flex items-center gap-3">
              <button 
                className="btn btn-primary"
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit Course
              </button>
              {isAdmin && (
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteCourse}
                  disabled={deleteCourseMutation.isPending}
                >
                  {deleteCourseMutation.isPending ? 'Deleting...' : 'Delete Course'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Course"
        size="lg"
      >
        <CourseForm
          onSubmit={handleUpdateCourse}
          onCancel={() => setIsEditModalOpen(false)}
          isLoading={isUpdating}
          initialData={{
            title: course.title,
            slug: course.slug,
            description: course.description,
            level: course.level,
            capacity: course.capacity,
            price: course.price,
            currency: course.currency,
            active: course.active
          }}
        />
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Course Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Level</dt>
              <dd className="mt-1 text-sm text-gray-900">{course.level}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Capacity</dt>
              <dd className="mt-1 text-sm text-gray-900">{course.capacity}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Price</dt>
              <dd className="mt-1 text-sm text-gray-900">{course.price.toLocaleString()} MMK</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    course.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {course.active ? 'Active' : 'Archived'}
                </span>
              </dd>
            </div>
            {course.description && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{course.description}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Schedules</h2>
            {!isTeacher && (
              <button 
                className="btn btn-primary text-sm"
                onClick={() => setIsScheduleModalOpen(true)}
              >
                + Add Schedule
              </button>
            )}
          </div>

          <Modal
            isOpen={isScheduleModalOpen}
            onClose={handleCancelSchedule}
            title={editingSchedule ? "Edit Schedule" : "Add New Schedule"}
            size="md"
          >
            {courseId > 0 && (
              <ScheduleForm
                courseId={courseId}
                onSubmit={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
                onCancel={handleCancelSchedule}
                isLoading={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                initialData={editingSchedule ? {
                  teacherId: editingSchedule.teacher_id,
                  startTime: editingSchedule.start_time 
                    ? new Date(editingSchedule.start_time).toISOString().slice(0, 16)
                    : '',
                  endTime: editingSchedule.end_time 
                    ? new Date(editingSchedule.end_time).toISOString().slice(0, 16)
                    : '',
                  timezone: editingSchedule.timezone || 'Asia/Yangon',
                  capacity: editingSchedule.capacity,
                  location: editingSchedule.location || '',
                  status: (editingSchedule.status as 'scheduled' | 'cancelled' | 'completed') || 'scheduled'
                } : undefined}
              />
            )}
          </Modal>

          {schedulesLoading ? (
            <p className="text-gray-600 text-sm">Loading schedules...</p>
          ) : schedules.length === 0 ? (
            <p className="text-gray-600 text-sm">No schedules yet.</p>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {new Date(schedule.start_time).toLocaleString()} -{' '}
                        {new Date(schedule.end_time).toLocaleString()}
                      </p>
                      {schedule.teacher_name && (
                        <p className="text-xs text-gray-600 mt-1">Teacher: {schedule.teacher_name}</p>
                      )}
                      {schedule.location && (
                        <p className="text-xs text-gray-600 mt-1">Location: {schedule.location}</p>
                      )}
                      <span
                        className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${
                          schedule.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : schedule.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {schedule.status}
                      </span>
                    </div>
                    {!isTeacher && (
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEditSchedule(schedule)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Schedule"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="btn btn-danger btn-sm"
                          title="Delete Schedule"
                          disabled={deleteScheduleMutation.isPending}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

