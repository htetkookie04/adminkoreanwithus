import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../../features/auth/store/authStore'
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  CheckCircle, 
  Video, 
  Calendar, 
  Settings, 
  LogOut
} from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const location = useLocation()

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

  let navigation: typeof baseNavigation = []
  if (isAdmin) {
    navigation = [...baseNavigation, ...adminNavigation]
  } else if (isTeacher) {
    // Teacher role: Courses, Lectures, and Timetable (no Dashboard, no Enrollments)
    navigation = [...teacherNavigation]
  } else if (isUser) {
    // User role can only see Lectures menu
    navigation = [...userNavigation]
  } else if (isViewer) {
    // Viewer role can only see Lectures menu (no Dashboard)
    navigation = [...userNavigation]
  } else if (isStudent) {
    navigation = [...baseNavigation, ...studentNavigation]
  } else {
    // Default fallback
    navigation = [...baseNavigation]
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
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
            {navigation.map((item) => {
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
            })}
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
                {user?.email || 'admin@korean...'}
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

