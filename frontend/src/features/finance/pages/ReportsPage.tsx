import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { useAllReport, useYearlyReport, useMonthlyReport, useDailyReport } from '../hooks/useFinance'
import type { FinanceReport } from '../lib/api'
import FinanceNav from '../components/FinanceNav'

type Period = 'all' | 'year' | 'month' | 'day'

function getDefaultYear() {
  return String(new Date().getFullYear())
}

function getDefaultMonth() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function getDefaultDate() {
  return new Date().toISOString().slice(0, 10)
}

function formatPeriodLabel(period: Period, value: string): string {
  if (period === 'year') return value
  if (period === 'month') {
    const [y, m] = value.split('-')
    const date = new Date(Number(y), Number(m) - 1, 1)
    return date.toLocaleString('default', { month: 'long', year: 'numeric' })
  }
  const d = new Date(value)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'year', label: 'Yearly' },
  { value: 'month', label: 'Monthly' },
  { value: 'day', label: 'Daily' }
]

const SUMMARY_BAR_COLORS = {
  Revenue: '#db2777',
  Expense: '#ec4899',
  Payroll: '#f472b6'
}

function getSummaryChartData(report: FinanceReport): { name: string; value: number; fill: string }[] {
  return [
    { name: 'Revenue', value: report.totalRevenue, fill: SUMMARY_BAR_COLORS.Revenue },
    { name: 'Expense', value: report.totalExpense, fill: SUMMARY_BAR_COLORS.Expense },
    { name: 'Payroll', value: report.totalPayroll ?? 0, fill: SUMMARY_BAR_COLORS.Payroll }
  ]
}

function getCategoryChartData(report: FinanceReport): { name: string; value: number; type: string }[] {
  return report.breakdownByCategory.map((row) => ({
    name: row.name,
    value: row.total,
    type: row.type
  }))
}

const PIE_COLORS = [
  '#9d174d',
  '#be185d',
  '#db2777',
  '#ec4899',
  '#f472b6',
  '#f9a8d4',
  '#fbcfe8',
  '#fce7f3'
]

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [year, setYear] = useState(getDefaultYear())
  const [month, setMonth] = useState(getDefaultMonth())
  const [date, setDate] = useState(getDefaultDate())

  const allReport = useAllReport()
  const yearly = useYearlyReport(period === 'year' ? year : null)
  const monthly = useMonthlyReport(period === 'month' ? month : null)
  const daily = useDailyReport(period === 'day' ? date : null)

  const isLoading =
    period === 'all' ? allReport.isLoading : period === 'year' ? yearly.isLoading : period === 'month' ? monthly.isLoading : daily.isLoading
  const report: FinanceReport | undefined =
    period === 'all'
      ? allReport.data?.data
      : period === 'year'
        ? yearly.data?.data
        : period === 'month'
          ? monthly.data?.data
          : daily.data?.data
  const periodLabel =
    period === 'all'
      ? 'All time'
      : period === 'year'
        ? formatPeriodLabel('year', year)
        : period === 'month'
          ? formatPeriodLabel('month', month)
          : formatPeriodLabel('day', date)

  return (
    <div className="space-y-6">
      <FinanceNav />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-4xl font-bold text-gray-900 shrink-0">Finance Reports</h1>
        <div className="flex items-center gap-2 flex-nowrap shrink-0">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 shrink-0">
            {PERIOD_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                  period === value ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {period === 'year' && (
            <input
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="input w-[100px] shrink-0"
            />
          )}
          {period === 'month' && (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input w-[130px] max-w-[130px] shrink-0 !py-1.5 !px-3 text-sm"
            />
          )}
          {period === 'day' && (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input w-[130px] max-w-[130px] shrink-0 !py-1.5 !px-3 text-sm"
            />
          )}
          {period === 'all' && <span className="text-sm text-gray-500 shrink-0">All time</span>}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600" />
        </div>
      ) : report ? (
        <>
          <p className="text-sm text-gray-500">
            Report for <span className="font-medium text-gray-700">{periodLabel}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-700">
                    {Number(report.totalRevenue).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Expense</p>
                  <p className="text-2xl font-bold text-red-700">
                    {Number(report.totalExpense).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Payroll</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {Number(report.totalPayroll ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-2">Net (Revenue − Expense − Payroll)</p>
                  <p className={`text-2xl font-bold ${report.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {Number(report.net).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary chart</h2>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getSummaryChartData(report)} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : String(v))} />
                    <Tooltip formatter={(v: number) => Number(v).toLocaleString()} />
                    <Legend />
                    <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                      {getSummaryChartData(report).map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Net = Revenue − (Expense + Payroll) = <span className={report.net >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{Number(report.net).toLocaleString()}</span>
              </p>
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">By category</h2>
              {report.breakdownByCategory.length > 0 ? (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getCategoryChartData(report)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {getCategoryChartData(report).map((_, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => Number(v).toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-8 text-center">No category data for this period.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">By category (table)</h2>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.breakdownByCategory.map((row) => (
                      <tr key={row.categoryId} className="hover:bg-gray-50">
                        <td className="font-medium text-gray-900">{row.name}</td>
                        <td>
                          <span
                            className={`badge ${row.type === 'REVENUE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="font-semibold">{Number(row.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">By payment method (table)</h2>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Revenue</th>
                      <th>Expense</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.breakdownByPaymentMethod.map((row) => (
                      <tr key={row.paymentMethod} className="hover:bg-gray-50">
                        <td className="font-medium text-gray-900">{row.paymentMethod}</td>
                        <td className="text-green-700">{Number(row.totalRevenue).toLocaleString()}</td>
                        <td className="text-red-700">{Number(row.totalExpense).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card p-8 text-center text-gray-500">
          Select a period (Year, Month, or Day) and date to view report.
        </div>
      )}
    </div>
  )
}
