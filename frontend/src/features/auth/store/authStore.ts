import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '../../../shared/lib/api'
import { queryClient } from '../../../shared/lib/queryClient'
import { usePermissionsStore } from './permissionsStore'

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  roleId: number
  roleName: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        // Create AbortController for timeout handling
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

        try {
          const response = await api.post('/auth/login', 
            { email, password },
            { signal: controller.signal }
          )
          const { user, accessToken, refreshToken } = response.data.data
          
          // Clear any stale cache before setting new auth state
          queryClient.clear()
          
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true
          })
          
          // Set default auth header
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          
          // Invalidate all queries to ensure fresh data is fetched
          // This ensures that when user navigates, they get the latest data
          queryClient.invalidateQueries()
        } catch (error: any) {
          // Handle timeout or network errors
          if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
            throw new Error('Request timeout. Please check your connection and try again.')
          }
          if (error.code === 'ERR_NETWORK' || error.message?.includes('CORS')) {
            throw new Error('Network error. Please check if the server is running and CORS is configured correctly.')
          }
          throw error
        } finally {
          clearTimeout(timeoutId)
        }
      },
      logout: () => {
        // Clear all React Query cache
        queryClient.clear()
        
        // Clear permissions
        usePermissionsStore.getState().clearPermissions()
        
        // Clear auth state
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false
        })
        
        // Remove auth header
        delete api.defaults.headers.common['Authorization']
        
        // Clear localStorage
        localStorage.removeItem('auth-storage')
        localStorage.removeItem('permissions-storage')
        
        // Force page reload to ensure all state is reset
        window.location.href = '/login'
      },
      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken })
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      },
      setUser: (user: User) => {
        set({ user })
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

