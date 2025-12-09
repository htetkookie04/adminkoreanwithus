import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { toast } from '../components/Toast'

export interface GalleryItem {
  id: number
  image_url: string
  caption?: string
  sort_order: number
  created_at: string
  updated_at: string
}

export function useGallery() {
  return useQuery({
    queryKey: ['gallery'],
    queryFn: async () => {
      const response = await api.get('/gallery')
      return response.data
    }
  })
}

export function usePublicGallery() {
  return useQuery({
    queryKey: ['gallery', 'public'],
    queryFn: async () => {
      const response = await api.get('/gallery/public')
      return response.data
    }
  })
}

export function useUploadGalleryImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/gallery', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
      toast.success('Image uploaded successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to upload image'
      toast.error(errorMessage)
    }
  })
}

export function useUpdateGalleryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { caption?: string; sortOrder?: number } }) => {
      const response = await api.put(`/gallery/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
      toast.success('Gallery item updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update gallery item')
    }
  })
}

export function useReorderGallery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items: Array<{ id: number; sortOrder: number }>) => {
      const response = await api.post('/gallery/reorder', { items })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
      toast.success('Gallery reordered successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reorder gallery')
    }
  })
}

export function useDeleteGalleryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/gallery/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
      toast.success('Image deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete image')
    }
  })
}

