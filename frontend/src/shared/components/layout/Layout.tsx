import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../../features/auth/store/authStore'
import { usePermissionsStore } from '../../../features/auth/store/permissionsStore'
import { api } from '../../lib/api'
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  CheckCircle, 
  Video, 
  Calendar, 
  Settings, 
  LogOut,
  DollarSign,
  LucideIcon
} from 'lucide-react'

interface MenuItem {
  name: string
  href: string
  icon: LucideIcon
}

interface MenuPermission {
  id: number
  menuKey: string
  menuLabel: string
  menuPath: string
  menuIcon: string
  sortOrder: number
}

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  Users,
  CheckCircle,
  Video,
  Calendar,
  Settings,
  DollarSign
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const { 
    menuPermissions, 
    fetchMenuPermissions, 
    refreshPermissions 
  } = usePermissionsStore()
  const [navigation, setNavigation] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch permissions on mount and when user role changes
  useEffect(() => {
    const loadPermissions = async () => {
      setLoading(true)
      await fetchMenuPermissions()
      setLoading(false)
    }
    
    loadPermissions()
  }, [user?.roleId, fetchMenuPermissions])

  // Convert menu permissions to navigation items
  useEffect(() => {
    if (menuPermissions.length > 0) {
      const menuItems: MenuItem[] = menuPermissions.map(permission => ({
        name: permission.menuLabel,
        href: permission.menuPath,
        icon: iconMap[permission.menuIcon] || BookOpen
      }))
      // Ensure Finance is visible for admin/super_admin even if not in DB permissions yet
      const currentUser = useAuthStore.getState().user
      const roleName = currentUser?.roleName ?? user?.roleName
      const isAdmin = roleName === 'admin' || roleName === 'super_admin'
      const hasFinance = menuItems.some(item => item.href.startsWith('/finance'))
      if (isAdmin && !hasFinance) {
        const timetableIndex = menuItems.findIndex(item => item.href === '/timetable')
        const insertIndex = timetableIndex >= 0 ? timetableIndex + 1 : menuItems.length
        menuItems.splice(insertIndex, 0, {
          name: 'Finance',
          href: '/finance/revenue',
          icon: DollarSign
        })
      }
      setNavigation(menuItems)
      setLoading(false)
    } else if (!loading) {
      // If no permissions and not loading, use fallback (includes Finance for admin)
      setNavigation(getFallbackNavigation())
    }
  }, [menuPermissions, loading, user?.roleName])

  // Listen for permission updates (when admin changes permissions)
  useEffect(() => {
    const handlePermissionsUpdated = async () => {
      console.log('🔄 Permissions updated, refreshing...')
      await refreshPermissions()
    }

    window.addEventListener('permissions-updated', handlePermissionsUpdated)
    return () => {
      window.removeEventListener('permissions-updated', handlePermissionsUpdated)
    }
  }, [refreshPermissions])

  const getFallbackNavigation = (): MenuItem[] => {
    const isAdmin = user?.roleName === 'admin' || user?.roleName === 'super_admin'
    const isTeacher = user?.roleName === 'teacher'
    const isUser = user?.roleName === 'user'
    const isViewer = user?.roleName === 'viewer'
    const isStudent = user?.roleName === 'student'

    const baseNavigation = [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Courses', href: '/courses', icon: BookOpen }
    ]

    const adminNavigation = [
      { name: 'Users', href: '/users', icon: Users },
      { name: 'Enrollments', href: '/enrollments', icon: CheckCircle },
      { name: 'Lectures', href: '/lectures', icon: Video },
      { name: 'Timetable', href: '/timetable', icon: Calendar },
      { name: 'Finance', href: '/finance/revenue', icon: DollarSign },
      { name: 'Settings', href: '/settings', icon: Settings }
    ]

    const teacherNavigation = [
      { name: 'Courses', href: '/courses', icon: BookOpen },
      { name: 'Lectures', href: '/lectures', icon: Video },
      { name: 'Timetable', href: '/timetable', icon: Calendar },
      { name: 'Settings', href: '/settings', icon: Settings }
    ]

    const userNavigation = [
      { name: 'Lectures', href: '/lectures', icon: Video },
      { name: 'Settings', href: '/settings', icon: Settings }
    ]

    const studentNavigation = [
      { name: 'My Lectures', href: '/my-lectures', icon: Video },
      { name: 'Settings', href: '/settings', icon: Settings }
    ]

    if (isAdmin) {
      return [...baseNavigation, ...adminNavigation]
    } else if (isTeacher) {
      return teacherNavigation
    } else if (isUser || isViewer) {
      return userNavigation
    } else if (isStudent) {
      return [...baseNavigation, ...studentNavigation]
    }
    
    return baseNavigation
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 shadow-sm">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-20 border-b border-gray-100 px-6">
            <img 
              src="/Korean with us.png" 
              alt="Korean With Us" 
              className="h-12 w-12 object-contain mr-3"
            />
            <h1 className="text-base font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent whitespace-nowrap">
              Korean With Us
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-4">
                No menus available
              </div>
            ) : (
              navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md shadow-pink-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                )
              })
            )}
          </nav>

          {/* User info */}
          <div className="p-5 border-t border-gray-100 bg-gray-50">
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user?.firstName || user?.lastName || 'User'}
              </p>
              <p className="text-xs text-gray-600 truncate mt-0.5">
                {user?.email || 'user@example.com'}
              </p>
              <span className="inline-block mt-2 px-2 py-1 text-xs font-bold text-pink-700 bg-pink-100 rounded-md uppercase">
                {user?.roleName || 'SUPER ADMIN'}
              </span>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="p-8 min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

