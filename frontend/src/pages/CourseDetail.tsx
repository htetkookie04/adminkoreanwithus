import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import CourseForm, { CourseFormData } from '../components/forms/CourseForm'
import ScheduleForm, { ScheduleFormData } from '../components/forms/ScheduleForm'
import Modal from '../components/Modal'
import { useSchedules, useCreateSchedule } from '../hooks/useSchedules'
import { useAuthStore } from '../store/authStore'

export default function CourseDetail() {
  const { user } = useAuthStore()
  const { id } = useParams()
  const courseId = id ? parseInt(id) : 0
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const isAdmin = user?.roleName === 'admin' || user?.roleName === 'super_admin'
  const isTeacher = user?.roleName === 'teacher'

  const { data: schedulesData, isLoading: schedulesLoading } = useSchedules(courseId)
  const createScheduleMutation = useCreateSchedule()
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
            <button 
              className="btn btn-primary"
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Course
            </button>
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
            onClose={() => setIsScheduleModalOpen(false)}
            title="Add New Schedule"
            size="md"
          >
            {courseId > 0 && (
              <ScheduleForm
                courseId={courseId}
                onSubmit={handleCreateSchedule}
                onCancel={() => setIsScheduleModalOpen(false)}
                isLoading={createScheduleMutation.isPending}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

