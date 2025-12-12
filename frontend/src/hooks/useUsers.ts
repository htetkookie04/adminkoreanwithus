import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { toast } from '../components/Toast'
import { UserFormData } from '../components/forms/UserForm'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  phone?: string
  role_id: number
  role_name: string
  status: string
  created_at: string
}

export function useUsers(params?: { page?: number; per_page?: number; q?: string; role?: string; status?: string }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.per_page) searchParams.append('per_page', params.per_page.toString())
      if (params?.q) searchParams.append('q', params.q)
      if (params?.role) searchParams.append('role', params.role)
      if (params?.status) searchParams.append('status', params.status)

      const response = await api.get(`/users?${searchParams}`)
      return response.data
    }
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UserFormData) => {
      const payload: any = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        roleId: data.roleId,
        status: data.status
      }
      
      // For new users, password is required (validation ensures it's not empty)
      // Only send password if it's provided and not empty
      if (data.password && data.password.trim().length > 0) {
        payload.password = data.password
      }
      
      const response = await api.post('/users', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to create user'
      toast.error(errorMessage)
    }
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserFormData> }) => {
      const response = await api.put(`/users/${id}`, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        roleId: data.roleId,
        status: data.status
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to update user'
      toast.error(errorMessage)
    }
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/users/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User permanently deleted successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to delete user'
      toast.error(errorMessage)
    }
  })
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, currentStatus }: { id: number; currentStatus: string }) => {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
      const response = await api.put(`/users/${id}`, {
        status: newStatus
      })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      const newStatus = variables.currentStatus === 'active' ? 'suspended' : 'active'
      toast.success(`User status updated to ${newStatus}`)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to update user status'
      toast.error(errorMessage)
    }
  })
}

