import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { api } from '../../../shared/lib/api'

const enrollmentSchema = z.object({
  userEmail: z.string().email('Valid email is required'),
  courseId: z.number().min(1, 'Course is required'),
  scheduleId: z.number().optional(),
  notes: z.string().optional(),
  source: z.string().default('admin')
})

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>

interface EnrollmentFormProps {
  onSubmit: (data: EnrollmentFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<EnrollmentFormData>
}

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
}

interface Course {
  id: number
  title: string
  level: string
}

interface Schedule {
  id: number
  start_time: string
  end_time: string
  location: string
  teacher_id: number
}

export default function EnrollmentForm({ onSubmit, onCancel, isLoading, initialData }: EnrollmentFormProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [searchingUser, setSearchingUser] = useState(false)
  const [userFound, setUserFound] = useState<User | null>(null)
  const [userError, setUserError] = useState<string>('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      userEmail: initialData?.userEmail || '',
      courseId: initialData?.courseId || 0,
      scheduleId: initialData?.scheduleId,
      notes: initialData?.notes || '',
      source: initialData?.source || 'admin'
    }
  })

  const selectedCourseId = watch('courseId')
  const userEmail = watch('userEmail')

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (selectedCourseId) {
      fetchSchedules(selectedCourseId)
    } else {
      setSchedules([])
    }
  }, [selectedCourseId])

  // Search for user by email when email changes
  useEffect(() => {
    const searchUser = async () => {
      if (!userEmail || userEmail.length < 3 || !userEmail.includes('@')) {
        setUserFound(null)
        setUserError('')
        return
      }

      // Debounce the search
      const timeoutId = setTimeout(async () => {
        try {
          setSearchingUser(true)
          setUserError('')
          const response = await api.get(`/users?q=${encodeURIComponent(userEmail)}&per_page=1`)
          const users = response.data.data || []
          const foundUser = users.find((u: User) => u.email.toLowerCase() === userEmail.toLowerCase())
          
          if (foundUser) {
            setUserFound(foundUser)
            setUserError('')
          } else {
            setUserFound(null)
            setUserError('User not found. The user will be created if they don\'t exist.')
          }
        } catch (error: any) {
          setUserFound(null)
          setUserError('Error searching for user')
          console.error('Failed to search user:', error)
        } finally {
          setSearchingUser(false)
        }
      }, 500) // Wait 500ms after user stops typing

      return () => clearTimeout(timeoutId)
    }

    searchUser()
  }, [userEmail])

  useEffect(() => {
    if (initialData) {
      reset(initialData)
    }
  }, [initialData, reset])

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true)
      const response = await api.get('/courses?per_page=100')
      setCourses(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    } finally {
      setLoadingCourses(false)
    }
  }

  const fetchSchedules = async (courseId: number) => {
    try {
      setLoadingSchedules(true)
      const response = await api.get(`/courses/${courseId}/schedules`)
      setSchedules(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
      setSchedules([])
    } finally {
      setLoadingSchedules(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          User Email <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="email"
            {...register('userEmail')}
            className="input w-full"
            placeholder="user@example.com"
          />
          {searchingUser && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            </div>
          )}
        </div>
        {errors.userEmail && <p className="text-red-500 text-xs mt-1">{errors.userEmail.message}</p>}
        {userFound && (
          <p className="text-green-600 text-xs mt-1">
            ✓ Found: {userFound.first_name} {userFound.last_name}
          </p>
        )}
        {userError && !userFound && (
          <p className="text-yellow-600 text-xs mt-1">{userError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Course <span className="text-red-500">*</span>
        </label>
        <select
          {...register('courseId', { valueAsNumber: true })}
          className="input w-full"
          disabled={loadingCourses}
        >
          <option value={0}>Select a course...</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title} ({course.level})
            </option>
          ))}
        </select>
        {errors.courseId && <p className="text-red-500 text-xs mt-1">{errors.courseId.message}</p>}
      </div>

      {selectedCourseId > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Schedule (Optional)</label>
          <select
            {...register('scheduleId', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
            className="input w-full"
            disabled={loadingSchedules}
          >
            <option value="">No specific schedule</option>
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {new Date(schedule.start_time).toLocaleString()} - {schedule.location || 'TBA'}
              </option>
            ))}
          </select>
          {schedules.length === 0 && selectedCourseId > 0 && !loadingSchedules && (
            <p className="text-xs text-gray-500 mt-1">No schedules available for this course</p>
          )}
          {errors.scheduleId && <p className="text-red-500 text-xs mt-1">{errors.scheduleId.message}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          {...register('notes')}
          className="input w-full"
          rows={3}
          placeholder="Additional notes about this enrollment..."
        />
        {errors.notes && <p className="text-red-500 text-xs mt-1">{errors.notes.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
        <select {...register('source')} className="input w-full">
          <option value="admin">Admin</option>
          <option value="website">Website</option>
          <option value="form">Form</option>
          <option value="referral">Referral</option>
          <option value="offline">Offline</option>
        </select>
        {errors.source && <p className="text-red-500 text-xs mt-1">{errors.source.message}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Enrollment'}
        </button>
      </div>
    </form>
  )
}

