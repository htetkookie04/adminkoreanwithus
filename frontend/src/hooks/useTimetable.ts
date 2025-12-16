import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { toast } from '../components/Toast'
import { TimetableFormData } from '../components/forms/TimetableForm'

export interface TimetableEntry {
  id: number
  course_name: string
  level: string
  day_of_week: string
  start_time: string
  end_time: string
  teacher_name: string
  status: string
  created_at: string
  updated_at: string
}

export function useTimetable(params?: { status?: string; dayOfWeek?: string }) {
  return useQuery({
    queryKey: ['timetable', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.status) searchParams.append('status', params.status)
      if (params?.dayOfWeek) searchParams.append('dayOfWeek', params.dayOfWeek)

      const response = await api.get(`/timetable?${searchParams}`)
      return response.data
    }
  })
}

export function usePublicTimetable() {
  return useQuery({
    queryKey: ['timetable', 'public'],
    queryFn: async () => {
      const response = await api.get('/timetable/public')
      return response.data
    }
  })
}

export function useCreateTimetableEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TimetableFormData) => {
      const response = await api.post('/timetable', {
        courseName: data.courseName,
        level: data.level,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        teacherName: data.teacherName,
        status: data.status
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      toast.success('Timetable entry created successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to create timetable entry'
      toast.error(errorMessage)
    }
  })
}

export function useUpdateTimetableEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TimetableFormData> }) => {
      // Build request body with only defined fields
      const requestBody: Record<string, any> = {}
      
      if (data.courseName !== undefined) requestBody.courseName = data.courseName
      if (data.level !== undefined) requestBody.level = data.level
      if (data.dayOfWeek !== undefined) requestBody.dayOfWeek = data.dayOfWeek
      if (data.startTime !== undefined && data.startTime !== null && data.startTime !== '') {
        requestBody.startTime = data.startTime
      }
      if (data.endTime !== undefined && data.endTime !== null && data.endTime !== '') {
        requestBody.endTime = data.endTime
      }
      if (data.teacherName !== undefined) requestBody.teacherName = data.teacherName
      if (data.status !== undefined) requestBody.status = data.status

      // Debug logging (remove in production)
      console.log('[Timetable Update] Sending update request:', {
        id,
        requestBody,
        originalData: data
      })

      const response = await api.put(`/timetable/${id}`, requestBody)
      
      console.log('[Timetable Update] Update response:', response.data)
      
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      toast.success('Timetable entry updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update timetable entry')
    }
  })
}

export function useDeleteTimetableEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/timetable/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      toast.success('Timetable entry deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete timetable entry')
    }
  })
}

