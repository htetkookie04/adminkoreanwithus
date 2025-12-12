import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { toast } from '../components/Toast'

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
  video_url?: string
  pdf?: File
  pdf_url?: string
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
      const response = await api.get(`/lectures/course/${courseId}`)
      return response.data
    },
    enabled: !!courseId
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
      // Add video URL if provided
      if (data.video_url && data.video_url.trim() !== '') {
        formData.append('video_url', data.video_url.trim())
      }
      // Check if pdf is a File instance before appending
      if (data.pdf && data.pdf instanceof File) {
        formData.append('pdf', data.pdf)
      }
      // Add PDF URL if provided
      if (data.pdf_url && data.pdf_url.trim() !== '') {
        formData.append('pdf_url', data.pdf_url.trim())
      }
      // Add resource link URL if provided
      if (data.resource_link_url && data.resource_link_url.trim() !== '') {
        formData.append('resource_link_url', data.resource_link_url.trim())
      }

      // Validate that at least one content source is provided
      const hasVideoContent = formData.has('video') || formData.has('video_url')
      const hasPdfContent = formData.has('pdf') || formData.has('pdf_url')
      const hasResourceLink = formData.has('resource_link_url')
      // If resource link is provided, video/PDF is optional
      if (!hasResourceLink && !hasVideoContent && !hasPdfContent) {
        throw new Error('At least one content source (video file, video URL, PDF file, PDF URL, or Resource Link URL) must be provided')
      }

      const response = await api.post('/lectures', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
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
    mutationFn: async ({ id, data }: { id: number; data: Partial<Omit<LectureFormData, 'video'>> }) => {
      const response = await api.put(`/lectures/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lectures'] })
      queryClient.invalidateQueries({ queryKey: ['lecture', variables.id] })
      toast.success('Lecture updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update lecture')
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

