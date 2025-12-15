import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { toast } from '../components/Toast'
import { CourseFormData } from '../components/forms/CourseForm'

export interface Course {
  id: number
  title: string
  slug: string
  description?: string
  level?: string
  capacity: number
  price: number
  currency: string
  active: boolean
  created_at: string
}

export function useCourses(params?: { page?: number; per_page?: number; q?: string; level?: string; active?: boolean }) {
  return useQuery({
    queryKey: ['courses', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.per_page) searchParams.append('per_page', params.per_page.toString())
      if (params?.q) searchParams.append('q', params.q)
      if (params?.level) searchParams.append('level', params.level)
      if (params?.active !== undefined) searchParams.append('active', params.active.toString())

      const response = await api.get(`/courses?${searchParams}`)
      return response.data
    }
  })
}

export function useCourse(id: number) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      if (!id || id <= 0 || isNaN(id)) {
        throw new Error('Invalid course ID')
      }
      try {
        const response = await api.get(`/courses/${id}`)
        return response.data
      } catch (error: any) {
        console.error('Error fetching course:', error)
        // Re-throw with more context
        if (error.response?.status === 403) {
          throw new Error('Access denied. You do not have permission to view this course.')
        } else if (error.response?.status === 404) {
          throw new Error('Course not found.')
        }
        throw error
      }
    },
    enabled: !!id && id > 0 && !isNaN(id),
    retry: (failureCount, error: any) => {
      // Don't retry on 403 (permission denied) or 404 (not found) errors
      if (error?.response?.status === 403 || error?.response?.status === 404) {
        return false
      }
      return failureCount < 1
    },
    staleTime: 30000 // Cache for 30 seconds
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CourseFormData) => {
      const response = await api.post('/courses', {
        title: data.title,
        slug: data.slug,
        description: data.description,
        level: data.level,
        capacity: data.capacity,
        price: data.price,
        currency: data.currency,
        active: data.active
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['courses', 'with-lectures'] })
      toast.success('Course created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create course')
    }
  })
}

export function useUpdateCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CourseFormData> }) => {
      const response = await api.put(`/courses/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      toast.success('Course updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update course')
    }
  })
}

export function useDeleteCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/courses/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      toast.success('Course archived successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete course')
    }
  })
}

export interface CourseWithLectures extends Course {
  lecture_count: number
  teacher_name?: string | null
}

export function useCoursesWithLectures() {
  return useQuery({
    queryKey: ['courses', 'with-lectures'],
    queryFn: async () => {
      const response = await api.get('/courses/with-lectures')
      return response.data
    },
    retry: 1,
    staleTime: 30000 // Cache for 30 seconds
  })
}

