import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '../lib/api'

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
        const response = await api.post('/auth/login', { email, password })
        const { user, accessToken, refreshToken } = response.data.data
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true
        })
        // Set default auth header
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      },
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false
        })
        delete api.defaults.headers.common['Authorization']
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

