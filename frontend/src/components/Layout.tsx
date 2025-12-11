import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const isAdmin = user?.roleName === 'admin' || user?.roleName === 'super_admin'
  const isTeacher = user?.roleName === 'teacher'
  const isUser = user?.roleName === 'user'
  const isViewer = user?.roleName === 'viewer'
  const isStudent = user?.roleName === 'student'

  const baseNavigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Courses', href: '/courses', icon: '📚' }
  ]

  const adminNavigation = [
    { name: 'Users', href: '/users', icon: '👥' },
    { name: 'Enrollments', href: '/enrollments', icon: '✅' },
    { name: 'Lectures', href: '/lectures', icon: '🎥' },
    { name: 'Timetable', href: '/timetable', icon: '📅' },
    { name: 'Settings', href: '/settings', icon: '⚙️' }
  ]

  const teacherNavigation = [
    { name: 'Courses', href: '/courses', icon: '📚' },
    { name: 'Lectures', href: '/lectures', icon: '🎥' },
    { name: 'Timetable', href: '/timetable', icon: '📅' }
  ]

  const userNavigation = [
    { name: 'Lectures', href: '/lectures', icon: '🎥' }
  ]

  const studentNavigation = [
    { name: 'My Lectures', href: '/my-lectures', icon: '🎥' }
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
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b border-gray-200">
            <h1 className="text-xl font-bold text-primary-600">Korean With Us</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.roleName}</p>
              </div>
              <button
                onClick={logout}
                className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

