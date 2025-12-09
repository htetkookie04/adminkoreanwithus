import { useState } from 'react'
import { api } from '../lib/api'

export default function Reports() {
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)

  const generateReport = async () => {
    try {
      setLoading(true)
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const response = await api.get(`/reports/enrollments?start=${startDate}&end=${endDate}`)
      setReportData(response.data.data)
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Reports & Analytics</h1>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Enrollment Report</h2>
        <button onClick={generateReport} className="btn btn-primary" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Last 30 Days Report'}
        </button>

        {reportData && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Timeline</h3>
            <div className="space-y-2">
              {reportData.timeline?.map((item: any) => (
                <div key={item.period} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">{item.period}</span>
                  <div className="flex gap-4 text-sm">
                    <span>Total: {item.count}</span>
                    <span className="text-green-600">Approved: {item.approved}</span>
                    <span className="text-yellow-600">Pending: {item.pending}</span>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="font-semibold mb-3 mt-6">Course Breakdown</h3>
            <div className="space-y-2">
              {reportData.courseBreakdown?.map((item: any) => (
                <div key={item.title} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">{item.title}</span>
                  <div className="flex gap-4 text-sm">
                    <span>Total: {item.enrollments}</span>
                    <span className="text-green-600">Approved: {item.approved}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">AI Summary</h2>
        <p className="text-gray-600 text-sm mb-4">
          Get AI-powered insights and recommendations based on your data.
        </p>
        <button className="btn btn-primary">Generate AI Summary</button>
      </div>
    </div>
  )
}

