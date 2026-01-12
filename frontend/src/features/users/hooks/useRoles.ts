import { useQuery } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'

export interface Role {
  id: number
  name: string
  description?: string
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get('/roles')
      return response.data
    }
  })
}

