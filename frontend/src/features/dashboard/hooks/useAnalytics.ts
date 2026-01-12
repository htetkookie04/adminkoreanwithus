import { useQuery } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'

export interface DashboardAnalytics {
  userCount: number
  courseCount: number
  enrollmentCount: number
  lectureCount: number
  timetableCount: number
  activeEnrollments: number
  pendingEnrollments: number
  activeUsers: number
  recentEnrollments: number
  enrollmentsByStatus: Record<string, number>
  usersByRole: Record<string, number>
}

export function useDashboardAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async () => {
      const response = await api.get('/analytics/dashboard')
      return response.data
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  })
}

