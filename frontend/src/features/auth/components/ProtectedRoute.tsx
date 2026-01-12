import { ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { usePermissionsStore } from '../store/permissionsStore'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()
  const { 
    fetchMenuPermissions, 
    isPathAllowed, 
    allowedPaths,
    isLoading 
  } = usePermissionsStore()

  // Fetch menu permissions when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchMenuPermissions()
    }
  }, [isAuthenticated, fetchMenuPermissions])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Show loading state while fetching permissions
  if (isLoading && allowedPaths.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading permissions...</p>
        </div>
      </div>
    )
  }

  // Check if current path is allowed based on menu permissions
  const currentPath = location.pathname
  
  // Allow root path for checking
  if (currentPath === '/') {
    return <>{children}</>
  }

  // Check if user has permission to access this path
  if (!isPathAllowed(currentPath)) {
    // Redirect to first allowed path or settings
    const firstAllowedPath = allowedPaths[0] || '/settings'
    console.log(`🚫 Access denied to ${currentPath}. Redirecting to ${firstAllowedPath}`)
    return <Navigate to={firstAllowedPath} replace />
  }

  return <>{children}</>
}

