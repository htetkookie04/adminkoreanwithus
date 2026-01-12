import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import { toast } from '../../../shared/components/ui/Toast'
import { EnrollmentFormData } from '../components/EnrollmentForm'

export interface Enrollment {
  id: number
  status: string
  payment_status: string
  enrolled_at: string
  course_title: string
  course_id: number
  user_id: number
  email: string
  first_name: string
  last_name: string
  schedule_id?: number
}

export function useEnrollments(params?: {
  page?: number
  per_page?: number
  courseId?: number
  userId?: number
  status?: string
  paymentStatus?: string
}) {
  return useQuery({
    queryKey: ['enrollments', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.per_page) searchParams.append('per_page', params.per_page.toString())
      if (params?.courseId) searchParams.append('courseId', params.courseId.toString())
      if (params?.userId) searchParams.append('userId', params.userId.toString())
      if (params?.status) searchParams.append('status', params.status)
      if (params?.paymentStatus) searchParams.append('paymentStatus', params.paymentStatus)

      const response = await api.get(`/enrollments?${searchParams}`)
      return response.data
    }
  })
}

export function useEnrollment(id: number | string | undefined) {
  return useQuery({
    queryKey: ['enrollment', id],
    queryFn: async () => {
      const response = await api.get(`/enrollments/${id}`)
      return response.data
    },
    enabled: !!id,
    staleTime: 0, // Always refetch when component mounts
    refetchOnMount: 'always' // Force refetch every time the component mounts
  })
}

export function useCreateEnrollment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: EnrollmentFormData) => {
      const payload: any = {
        userEmail: data.userEmail, // Send email instead of userId
        courseId: data.courseId,
        notes: data.notes,
        source: data.source
      }
      
      // Only include scheduleId if it's provided
      if (data.scheduleId) {
        payload.scheduleId = data.scheduleId
      }
      
      const response = await api.post('/enrollments', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('Enrollment created successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to create enrollment'
      toast.error(errorMessage)
    }
  })
}

export function useUpdateEnrollment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { status?: string; notes?: string; paymentStatus?: string } }) => {
      const response = await api.put(`/enrollments/${id}`, data)
      return response.data
    },
    onSuccess: (responseData, variables) => {
      // Update the enrollment cache immediately with the response data
      // This ensures the UI updates instantly without waiting for a refetch
      queryClient.setQueryData(['enrollment', variables.id.toString()], responseData)
      queryClient.setQueryData(['enrollment', variables.id], responseData)
      
      // Invalidate queries to ensure all related data is refreshed
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['enrollment', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['enrollment', variables.id.toString()] })
      
      toast.success('Enrollment updated successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to update enrollment'
      toast.error(errorMessage)
    }
  })
}

export function useApproveEnrollment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/enrollments/${id}/approve`)
      return response.data
    },
    onSuccess: (data, variables) => {
      // Invalidate both the list and individual enrollment caches
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['enrollment', variables] })
      queryClient.invalidateQueries({ queryKey: ['enrollment', variables.toString()] })
      toast.success('Enrollment approved successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to approve enrollment'
      toast.error(errorMessage)
    }
  })
}

export function useDeleteEnrollment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/enrollments/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['enrollment'] })
      toast.success('Enrollment permanently deleted successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to delete enrollment'
      toast.error(errorMessage)
    }
  })
}

