import { Link, Navigate } from 'react-router-dom'
import { useDashboardAnalytics } from '../hooks/useAnalytics'
import { useAuthStore } from '../store/authStore'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { data, isLoading } = useDashboardAnalytics()
  const analytics = data?.data

  // Redirect viewer, user, and teacher roles to lectures (they don't have access to dashboard)
  if (user?.roleName === 'viewer' || user?.roleName === 'user' || user?.roleName === 'teacher') {
    return <Navigate to="/lectures" replace />
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading dashboard...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analytics?.userCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active: {analytics?.activeUsers || 0}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Courses</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analytics?.courseCount || 0}</p>
            </div>
            <div className="text-4xl">📚</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Enrollments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analytics?.enrollmentCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active: {analytics?.activeEnrollments || 0}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Enrollments</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{analytics?.pendingEnrollments || 0}</p>
            </div>
            <div className="text-4xl">⏳</div>
          </div>
          {analytics && analytics.pendingEnrollments > 0 && (
            <Link to="/enrollments?status=pending" className="text-sm text-primary-600 hover:underline mt-2 block">
              Review pending →
            </Link>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Lectures</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analytics?.lectureCount || 0}</p>
            </div>
            <div className="text-4xl">🎥</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Timetable Entries</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analytics?.timetableCount || 0}</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Enrollments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analytics?.recentEnrollments || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/users" className="btn btn-secondary text-left">
            👥 Manage Users
          </Link>
          <Link to="/courses" className="btn btn-secondary text-left">
            📚 Manage Courses
          </Link>
          <Link to="/enrollments" className="btn btn-secondary text-left">
            ✅ Manage Enrollments
          </Link>
        </div>
      </div>

      {/* AI Insights Placeholder */}
      <div className="card mt-6">
        <h2 className="text-xl font-semibold mb-4">AI Insights</h2>
        <p className="text-gray-600">
          AI-powered insights and recommendations will appear here once configured.
        </p>
      </div>
    </div>
  )
}

