import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'

const timetableSchema = z.object({
  courseName: z.string().min(1, 'Course name is required'),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'TOPIK']),
  dayOfWeek: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)'),
  teacherName: z.string().min(1, 'Teacher name is required'),
  status: z.enum(['active', 'cancelled', 'completed']).default('active')
}).refine((data) => data.endTime > data.startTime, {
  message: 'End time must be after start time',
  path: ['endTime']
})

export type TimetableFormData = z.infer<typeof timetableSchema>

interface TimetableFormProps {
  onSubmit: (data: TimetableFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<TimetableFormData>
}

export default function TimetableForm({ onSubmit, onCancel, isLoading, initialData }: TimetableFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<TimetableFormData>({
    resolver: zodResolver(timetableSchema),
    defaultValues: {
      courseName: initialData?.courseName || '',
      level: initialData?.level || 'Beginner',
      dayOfWeek: initialData?.dayOfWeek || 'Monday',
      startTime: initialData?.startTime || '09:00',
      endTime: initialData?.endTime || '10:30',
      teacherName: initialData?.teacherName || '',
      status: initialData?.status || 'active'
    }
  })

  useEffect(() => {
    if (initialData) {
      reset(initialData)
    }
  }, [initialData, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Course Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('courseName')}
          className="input w-full"
          placeholder="Korean Language Level 1"
        />
        {errors.courseName && <p className="text-red-500 text-xs mt-1">{errors.courseName.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Level <span className="text-red-500">*</span>
          </label>
          <select {...register('level')} className="input w-full">
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="TOPIK">TOPIK</option>
          </select>
          {errors.level && <p className="text-red-500 text-xs mt-1">{errors.level.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Day of Week <span className="text-red-500">*</span>
          </label>
          <select {...register('dayOfWeek')} className="input w-full">
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
            <option value="Sunday">Sunday</option>
          </select>
          {errors.dayOfWeek && <p className="text-red-500 text-xs mt-1">{errors.dayOfWeek.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
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
            type="time"
            {...register('endTime')}
            className="input w-full"
          />
          {errors.endTime && <p className="text-red-500 text-xs mt-1">{errors.endTime.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Teacher Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('teacherName')}
          className="input w-full"
          placeholder="Teacher Name"
        />
        {errors.teacherName && <p className="text-red-500 text-xs mt-1">{errors.teacherName.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select {...register('status')} className="input w-full">
          <option value="active">Active</option>
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
          {isLoading ? 'Saving...' : 'Save Entry'}
        </button>
      </div>
    </form>
  )
}

