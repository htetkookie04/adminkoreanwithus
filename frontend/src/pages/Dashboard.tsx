import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Link } from 'react-router-dom'

interface DashboardStats {
  totalUsers: number
  activeStudents: number
  newRegistrations: number
  totalEnrollments: number
  pendingEnrollments: number
  pendingInquiries: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch various stats
      const [users, enrollments, inquiries] = await Promise.all([
        api.get('/users?per_page=1'),
        api.get('/enrollments?per_page=1'),
        api.get('/inquiries?status=new&per_page=1')
      ])

      // Calculate stats (simplified - in real app, use dedicated stats endpoint)
      const totalUsers = users.data.pagination?.total || 0
      const totalEnrollments = enrollments.data.pagination?.total || 0
      const pendingEnrollments = enrollments.data.data?.filter((e: any) => e.status === 'pending').length || 0
      const pendingInquiries = inquiries.data.pagination?.total || 0

      setStats({
        totalUsers,
        activeStudents: totalUsers, // Simplified
        newRegistrations: 0, // Would need date filter
        totalEnrollments,
        pendingEnrollments,
        pendingInquiries
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalUsers || 0}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Enrollments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalEnrollments || 0}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Enrollments</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats?.pendingEnrollments || 0}</p>
            </div>
            <div className="text-4xl">⏳</div>
          </div>
          {stats && stats.pendingEnrollments > 0 && (
            <Link to="/enrollments?status=pending" className="text-sm text-primary-600 hover:underline mt-2 block">
              Review pending →
            </Link>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Inquiries</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats?.pendingInquiries || 0}</p>
            </div>
            <div className="text-4xl">💬</div>
          </div>
          {stats && stats.pendingInquiries > 0 && (
            <Link to="/inquiries?status=new" className="text-sm text-primary-600 hover:underline mt-2 block">
              View inquiries →
            </Link>
          )}
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

