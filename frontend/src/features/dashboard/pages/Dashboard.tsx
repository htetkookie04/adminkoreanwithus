import { Link, Navigate } from 'react-router-dom'
import { useDashboardAnalytics } from '../hooks/useAnalytics'
import { useAuthStore } from '../../auth/store/authStore'
import { 
  Users, 
  BookOpen, 
  CheckCircle, 
  Hourglass, 
  Video, 
  Calendar, 
  TrendingUp,
  UserPlus,
  GraduationCap
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { data, isLoading } = useDashboardAnalytics()
  const analytics = data?.data

  // Redirect viewer, user, and teacher roles to lectures (they don't have access to dashboard)
  if (user?.roleName === 'viewer' || user?.roleName === 'user' || user?.roleName === 'teacher') {
    return <Navigate to="/lectures" replace />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-2">Total Users</p>
              <p className="text-4xl font-bold text-gray-900">{analytics?.userCount || 0}</p>
              <p className="text-sm text-gray-500 mt-2">Active: {analytics?.activeUsers || 0}</p>
            </div>
            <div className="icon-wrapper bg-pink-100">
              <Users className="w-7 h-7 text-pink-600" />
            </div>
          </div>
        </div>

        {/* Total Courses */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-2">Total Courses</p>
              <p className="text-4xl font-bold text-gray-900">{analytics?.courseCount || 0}</p>
            </div>
            <div className="icon-wrapper bg-pink-100">
              <BookOpen className="w-7 h-7 text-pink-600" />
            </div>
          </div>
        </div>

        {/* Total Enrollments */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-2">Total Enrollments</p>
              <p className="text-4xl font-bold text-gray-900">{analytics?.enrollmentCount || 0}</p>
              <p className="text-sm text-gray-500 mt-2">Active: {analytics?.activeEnrollments || 0}</p>
            </div>
            <div className="icon-wrapper bg-pink-100">
              <CheckCircle className="w-7 h-7 text-pink-600" />
            </div>
          </div>
        </div>

        {/* Pending Enrollments */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-2">Pending Enrollments</p>
              <p className="text-4xl font-bold text-red-600">{analytics?.pendingEnrollments || 0}</p>
            </div>
            <div className="icon-wrapper bg-red-100">
              <Hourglass className="w-7 h-7 text-red-600" />
            </div>
          </div>
          {analytics && analytics.pendingEnrollments > 0 && (
            <Link to="/enrollments?status=pending" className="text-sm text-pink-600 hover:text-pink-700 font-medium mt-3 inline-flex items-center">
              Review pending →
            </Link>
          )}
        </div>

        {/* Lectures */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-2">Lectures</p>
              <p className="text-4xl font-bold text-gray-900">{analytics?.lectureCount || 0}</p>
            </div>
            <div className="icon-wrapper bg-pink-100">
              <Video className="w-7 h-7 text-pink-600" />
            </div>
          </div>
        </div>

        {/* Timetable Entries */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-2">Timetable Entries</p>
              <p className="text-4xl font-bold text-gray-900">{analytics?.timetableCount || 0}</p>
            </div>
            <div className="icon-wrapper bg-pink-100">
              <Calendar className="w-7 h-7 text-pink-600" />
            </div>
          </div>
        </div>

        {/* Recent Enrollments */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-2">Recent Enrollments</p>
              <p className="text-4xl font-bold text-gray-900">{analytics?.recentEnrollments || 0}</p>
              <p className="text-sm text-gray-500 mt-2">Last 7 days</p>
            </div>
            <div className="icon-wrapper bg-pink-100">
              <TrendingUp className="w-7 h-7 text-pink-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            to="/users" 
            className="flex items-center justify-center gap-3 px-6 py-4 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl font-semibold transition-all duration-200 border border-pink-200"
          >
            <UserPlus className="w-5 h-5" />
            Manage Users
          </Link>
          <Link 
            to="/courses" 
            className="flex items-center justify-center gap-3 px-6 py-4 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl font-semibold transition-all duration-200 border border-pink-200"
          >
            <GraduationCap className="w-5 h-5" />
            Manage Courses
          </Link>
          <Link 
            to="/enrollments" 
            className="flex items-center justify-center gap-3 px-6 py-4 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl font-semibold transition-all duration-200 border border-pink-200"
          >
            <CheckCircle className="w-5 h-5" />
            Manage Enrollments
          </Link>
        </div>
      </div>
    </div>
  )
}

