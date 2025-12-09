import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { toast } from '../components/Toast'
import { ScheduleFormData } from '../components/forms/ScheduleForm'

export interface Schedule {
  id: number
  course_id: number
  teacher_id?: number
  start_time: string
  end_time: string
  timezone: string
  capacity?: number
  location?: string
  status: string
  teacher_name?: string
  created_at: string
  updated_at: string
}

export function useSchedules(courseId: number) {
  return useQuery({
    queryKey: ['schedules', courseId],
    queryFn: async () => {
      const response = await api.get(`/courses/${courseId}/schedules`)
      return response.data
    },
    enabled: !!courseId
  })
}

export function useCreateSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ courseId, data }: { courseId: number; data: ScheduleFormData }) => {
      const response = await api.post(`/courses/${courseId}/schedules`, {
        teacherId: data.teacherId,
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone,
        capacity: data.capacity,
        location: data.location,
        status: data.status
      })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.courseId] })
      toast.success('Schedule created successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to create schedule'
      toast.error(errorMessage)
    }
  })
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ courseId, scheduleId, data }: { courseId: number; scheduleId: number; data: Partial<ScheduleFormData> }) => {
      const response = await api.put(`/courses/${courseId}/schedules/${scheduleId}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.courseId] })
      toast.success('Schedule updated successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to update schedule'
      toast.error(errorMessage)
    }
  })
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ courseId, scheduleId }: { courseId: number; scheduleId: number }) => {
      const response = await api.delete(`/courses/${courseId}/schedules/${scheduleId}`)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.courseId] })
      toast.success('Schedule deleted successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to delete schedule'
      toast.error(errorMessage)
    }
  })
}

