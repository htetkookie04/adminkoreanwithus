import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

const scheduleSchema = z.object({
  teacherId: z.number().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  timezone: z.string().default('Asia/Yangon'),
  capacity: z.number().min(0, 'Capacity must be 0 or greater').optional(),
  location: z.string().optional(),
  status: z.enum(['scheduled', 'cancelled', 'completed']).default('scheduled')
}).refine((data) => {
  if (data.startTime && data.endTime) {
    return new Date(data.endTime) > new Date(data.startTime)
  }
  return true
}, {
  message: 'End time must be after start time',
  path: ['endTime']
})

export type ScheduleFormData = z.infer<typeof scheduleSchema>

interface ScheduleFormProps {
  courseId: number
  onSubmit: (data: ScheduleFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<ScheduleFormData>
}

interface User {
  id: number
  first_name: string
  last_name: string
  email: string
}

export default function ScheduleForm({ courseId, onSubmit, onCancel, isLoading, initialData }: ScheduleFormProps) {
  const [teachers, setTeachers] = useState<User[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      teacherId: initialData?.teacherId,
      startTime: initialData?.startTime || '',
      endTime: initialData?.endTime || '',
      timezone: initialData?.timezone || 'Asia/Yangon',
      capacity: initialData?.capacity,
      location: initialData?.location || '',
      status: initialData?.status || 'scheduled'
    }
  })

  useEffect(() => {
    fetchTeachers()
  }, [])

  useEffect(() => {
    if (initialData) {
      reset(initialData)
    }
  }, [initialData, reset])

  const fetchTeachers = async () => {
    try {
      setLoadingTeachers(true)
      // Fetch all users and filter for teachers on frontend, or use role_id if backend supports it
      const response = await api.get('/users?per_page=100')
      const allUsers = response.data.data || []
      // Filter for teachers (role_name === 'teacher' or role_id === 4)
      const teacherUsers = allUsers.filter((user: any) => 
        user.role_name === 'teacher' || user.role_id === 4
      )
      setTeachers(teacherUsers)
    } catch (error) {
      console.error('Failed to fetch teachers:', error)
      // If API fails, set empty array so form can still be used
      setTeachers([])
    } finally {
      setLoadingTeachers(false)
    }
  }

  const handleFormSubmit = async (data: ScheduleFormData) => {
    console.log('Schedule form data:', data)
    // Ensure datetime strings are properly formatted
    const formattedData = {
      ...data,
      startTime: data.startTime ? new Date(data.startTime).toISOString() : '',
      endTime: data.endTime ? new Date(data.endTime).toISOString() : ''
    }
    console.log('Formatted schedule data:', formattedData)
    await onSubmit(formattedData)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teacher (Optional)</label>
        <select
          {...register('teacherId', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
          className="input w-full"
          disabled={loadingTeachers}
        >
          <option value="">No teacher assigned</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.first_name} {teacher.last_name} ({teacher.email})
            </option>
          ))}
        </select>
        {errors.teacherId && <p className="text-red-500 text-xs mt-1">{errors.teacherId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            {...register('startTime')}
            className="input w-full"
          />
          {errors.startTime && <p className="text-red-500 text-xs mt-1">{errors.startTime.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            {...register('endTime')}
            className="input w-full"
          />
          {errors.endTime && <p className="text-red-500 text-xs mt-1">{errors.endTime.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
          <select {...register('timezone')} className="input w-full">
            <option value="Asia/Yangon">Asia/Yangon (Myanmar)</option>
            <option value="Asia/Singapore">Asia/Singapore</option>
            <option value="UTC">UTC</option>
          </select>
          {errors.timezone && <p className="text-red-500 text-xs mt-1">{errors.timezone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Optional)</label>
          <input
            type="number"
            {...register('capacity', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
            className="input w-full"
            min="0"
            placeholder="Leave empty for no limit"
          />
          {errors.capacity && <p className="text-red-500 text-xs mt-1">{errors.capacity.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <input
          type="text"
          {...register('location')}
          className="input w-full"
          placeholder="Zoom link, classroom address, or TBA"
        />
        {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select {...register('status')} className="input w-full">
          <option value="scheduled">Scheduled</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
        {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status.message}</p>}
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
          {isLoading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Schedule' : 'Create Schedule')}
        </button>
      </div>
    </form>
  )
}

