import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '../../../shared/lib/api'

export interface MenuPermission {
  id: number
  menuKey: string
  menuLabel: string
  menuPath: string
  menuIcon: string
  sortOrder: number
}

interface PermissionsState {
  menuPermissions: MenuPermission[]
  allowedPaths: string[]
  isLoading: boolean
  lastFetched: number | null
  fetchMenuPermissions: () => Promise<void>
  refreshPermissions: () => Promise<void>
  isPathAllowed: (path: string) => boolean
  clearPermissions: () => void
}

export const usePermissionsStore = create<PermissionsState>()(
  persist(
    (set, get) => ({
      menuPermissions: [],
      allowedPaths: [],
      isLoading: false,
      lastFetched: null,

      fetchMenuPermissions: async () => {
        const state = get()
        
        // Avoid fetching if we recently fetched (within 5 seconds)
        if (state.lastFetched && Date.now() - state.lastFetched < 5000) {
          return
        }

        set({ isLoading: true })
        
        try {
          const response = await api.get('/menu-permissions/me')
          const permissions: MenuPermission[] = response.data.data || []
          
          // Extract all allowed paths from permissions
          const paths = permissions.map(p => p.menuPath)
          
          set({
            menuPermissions: permissions,
            allowedPaths: paths,
            isLoading: false,
            lastFetched: Date.now()
          })
          
          console.log('✅ Menu permissions loaded:', paths)
        } catch (error) {
          console.error('❌ Failed to fetch menu permissions:', error)
          set({ isLoading: false })
        }
      },

      refreshPermissions: async () => {
        // Force refresh by clearing lastFetched
        set({ lastFetched: null })
        await get().fetchMenuPermissions()
      },

      isPathAllowed: (path: string): boolean => {
        const { allowedPaths } = get()
        
        // Always allow settings path for all authenticated users
        if (path === '/settings' || path.startsWith('/settings/')) {
          return true
        }
        
        // Check if the path matches any allowed path
        return allowedPaths.some(allowedPath => {
          // Exact match
          if (path === allowedPath) return true
          
          // Check if path starts with allowed path (for nested routes)
          if (path.startsWith(allowedPath + '/')) return true
          
          return false
        })
      },

      clearPermissions: () => {
        set({
          menuPermissions: [],
          allowedPaths: [],
          isLoading: false,
          lastFetched: null
        })
      }
    }),
    {
      name: 'permissions-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        menuPermissions: state.menuPermissions,
        allowedPaths: state.allowedPaths,
        lastFetched: state.lastFetched
      })
    }
  )
)

