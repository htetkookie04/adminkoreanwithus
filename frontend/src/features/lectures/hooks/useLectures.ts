import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import { toast } from '../../../shared/components/ui/Toast'

export interface Lecture {
  id: number
  course_id: number
  title: string
  description?: string
  video_url?: string | null
  pdf_url?: string | null
  resource_link_url?: string | null
  uploaded_by: number
  role_of_uploader: 'admin' | 'teacher'
  created_at: string
  updated_at: string
  course_title?: string
  course_level?: string
  uploader_name?: string
}

export interface LectureFormData {
  course_id: number
  title: string
  description?: string
  video?: File
  pdf?: File
  resource_link_url?: string
}

export function useLectures(params?: {
  page?: number
  per_page?: number
  courseId?: number
}) {
  return useQuery({
    queryKey: ['lectures', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.per_page) searchParams.append('per_page', params.per_page.toString())
      if (params?.courseId) searchParams.append('courseId', params.courseId.toString())

      const response = await api.get(`/lectures?${searchParams}`)
      return response.data
    }
  })
}

export function useLecture(id: number) {
  return useQuery({
    queryKey: ['lecture', id],
    queryFn: async () => {
      const response = await api.get(`/lectures/${id}`)
      return response.data
    },
    enabled: !!id
  })
}

export function useLecturesByCourse(courseId: number) {
  return useQuery({
    queryKey: ['lectures', 'course', courseId],
    queryFn: async () => {
      if (!courseId || courseId <= 0 || isNaN(courseId)) {
        throw new Error('Invalid course ID')
      }
      try {
        console.log('Fetching lectures for courseId:', courseId)
        const response = await api.get(`/lectures/course/${courseId}`)
        console.log('Lectures API response:', response.data)
        // Handle both response.data.data and response.data structures
        return response.data
      } catch (error: any) {
        console.error('Error fetching lectures:', error)
        // Re-throw with more context
        if (error.response?.status === 403) {
          throw new Error('Access denied. You are not enrolled in this course.')
        } else if (error.response?.status === 404) {
          throw new Error('Course not found.')
        } else if (error.response?.status === 400) {
          throw new Error(error.response?.data?.message || 'Invalid course ID.')
        }
        throw error
      }
    },
    enabled: !!courseId && courseId > 0 && !isNaN(courseId),
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

export function useCreateLecture() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: LectureFormData) => {
      const formData = new FormData()
      formData.append('course_id', data.course_id.toString())
      formData.append('title', data.title)
      if (data.description) {
        formData.append('description', data.description)
      }
      // Check if video is a File instance before appending
      if (data.video && data.video instanceof File) {
        formData.append('video', data.video)
      }
      // Check if pdf is a File instance before appending
      if (data.pdf && data.pdf instanceof File) {
        formData.append('pdf', data.pdf)
      }
      // Add resource link URL if provided
      const trimmedResourceLink = data.resource_link_url?.trim() || ''
      if (trimmedResourceLink.length > 0) {
        formData.append('resource_link_url', trimmedResourceLink)
        // Also append as resourceLink for compatibility (temporary)
        formData.append('resourceLink', trimmedResourceLink)
      }

      // Validate that at least one content source is provided
      const hasVideoContent = formData.has('video')
      const hasPdfContent = formData.has('pdf')
      const hasResourceLink = trimmedResourceLink.length > 0
      // If resource link is provided, video/PDF is optional
      if (!hasResourceLink && !hasVideoContent && !hasPdfContent) {
        throw new Error('At least one content source (video file, PDF file, or Resource Link URL) must be provided')
      }

      // Don't set Content-Type manually - axios will set it with the correct boundary
      // The API interceptor will handle removing the default Content-Type for FormData
      const response = await api.post('/lectures', formData)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lectures'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['courses', 'with-lectures'] })
      toast.success('Lecture uploaded successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error?.message || 
                          error.message || 
                          'Failed to upload lecture'
      toast.error(errorMessage)
    }
  })
}

export function useUpdateLecture() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<LectureFormData> }) => {
      // Check if we have files to upload - if so, use FormData
      const hasFiles = (data.video && data.video instanceof File) || (data.pdf && data.pdf instanceof File)
      
      if (hasFiles) {
        // Use FormData for file uploads
        const formData = new FormData()
        if (data.course_id !== undefined) {
          formData.append('course_id', data.course_id.toString())
        }
        if (data.title !== undefined) {
          formData.append('title', data.title)
        }
        if (data.description !== undefined) {
          formData.append('description', data.description)
        }
        // Check if video is a File instance before appending
        if (data.video && data.video instanceof File) {
          formData.append('video', data.video)
        }
        // Check if pdf is a File instance before appending
        if (data.pdf && data.pdf instanceof File) {
          formData.append('pdf', data.pdf)
        }
        // Add resource link URL if provided (always append, even if empty, so backend knows it was provided)
        if (data.resource_link_url !== undefined) {
          const trimmedResourceLink = data.resource_link_url?.trim() || ''
          formData.append('resource_link_url', trimmedResourceLink)
          // Also append as resourceLink for compatibility (temporary)
          formData.append('resourceLink', trimmedResourceLink)
        }

        // Don't set Content-Type manually - axios will set it with the correct boundary
        const response = await api.put(`/lectures/${id}`, formData)
        return response.data
      } else {
        // Use JSON for non-file updates
        const jsonData: any = {}
        if (data.course_id !== undefined) jsonData.course_id = data.course_id
        if (data.title !== undefined) jsonData.title = data.title
        if (data.description !== undefined) jsonData.description = data.description
        if (data.resource_link_url !== undefined) {
          jsonData.resource_link_url = data.resource_link_url.trim() || null
        }
        
        const response = await api.put(`/lectures/${id}`, jsonData)
        return response.data
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lectures'] })
      queryClient.invalidateQueries({ queryKey: ['lecture', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['courses', 'with-lectures'] })
      toast.success('Lecture updated successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error?.message || 
                          error.message || 
                          'Failed to update lecture'
      toast.error(errorMessage)
    }
  })
}

export function useDeleteLecture() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/lectures/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lectures'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['courses', 'with-lectures'] })
      toast.success('Lecture deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete lecture')
    }
  })
}

