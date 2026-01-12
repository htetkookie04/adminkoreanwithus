import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import { toast } from '../../../shared/components/ui/Toast'
import { TimetableFormData } from '../components/TimetableForm'

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
      // Build request body - always include all fields from form data
      // The form should always provide all fields, so we send them all
      const requestBody: Record<string, any> = {}
      
      // Always include all fields that are provided (form should provide all)
      if (data.courseName !== undefined) requestBody.courseName = data.courseName
      if (data.level !== undefined) requestBody.level = data.level
      if (data.dayOfWeek !== undefined) requestBody.dayOfWeek = data.dayOfWeek
      
      // Time fields - ensure they're always included if present
      if (data.startTime !== undefined && data.startTime !== null && data.startTime !== '') {
        // Ensure time is in HH:MM format (24-hour)
        const timeStr = String(data.startTime).trim()
        requestBody.startTime = timeStr
      } else {
        console.warn('[Timetable Update] startTime is missing or empty:', data.startTime)
      }
      
      if (data.endTime !== undefined && data.endTime !== null && data.endTime !== '') {
        // Ensure time is in HH:MM format (24-hour)
        const timeStr = String(data.endTime).trim()
        requestBody.endTime = timeStr
      } else {
        console.warn('[Timetable Update] endTime is missing or empty:', data.endTime)
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
    onSuccess: (data) => {
      // Invalidate all timetable queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      // Also set the updated data directly for immediate UI update
      queryClient.setQueriesData({ queryKey: ['timetable'] }, (oldData: any) => {
        if (!oldData) return oldData
        // Update the specific entry in the cache
        const updatedEntry = data.data
        return {
          ...oldData,
          data: oldData.data.map((entry: TimetableEntry) => 
            entry.id === updatedEntry.id ? {
              ...entry,
              start_time: updatedEntry.start_time,
              end_time: updatedEntry.end_time,
              course_name: updatedEntry.course_name,
              level: updatedEntry.level,
              day_of_week: updatedEntry.day_of_week,
              teacher_name: updatedEntry.teacher_name,
              status: updatedEntry.status
            } : entry
          )
        }
      })
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

// Hook for updating timetable status (for teachers)
export function useUpdateTimetableStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await api.patch(`/timetable/${id}/status`, { status })
      return response.data
    },
    onSuccess: (data) => {
      // Invalidate and refetch timetable queries
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      // Update cache immediately for instant UI feedback
      queryClient.setQueriesData({ queryKey: ['timetable'] }, (oldData: any) => {
        if (!oldData) return oldData
        const updatedEntry = data.data
        return {
          ...oldData,
          data: oldData.data.map((entry: TimetableEntry) => 
            entry.id === updatedEntry.id ? {
              ...entry,
              status: updatedEntry.status,
              updated_at: updatedEntry.updated_at
            } : entry
          )
        }
      })
      toast.success('Status updated successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to update status'
      toast.error(errorMessage)
    }
  })
}

