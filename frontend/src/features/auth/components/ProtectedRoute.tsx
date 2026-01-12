import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Viewer and User role restrictions: only allow /lectures routes
  if (user?.roleName === 'viewer' || user?.roleName === 'user') {
    const allowedPaths = ['/lectures']
    const isAllowedPath = allowedPaths.some(path => 
      location.pathname === path || location.pathname.startsWith(path + '/')
    )
    
    if (!isAllowedPath) {
      return <Navigate to="/lectures" replace />
    }
  }

  return <>{children}</>
}

