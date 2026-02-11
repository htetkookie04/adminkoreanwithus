import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/finance/revenue', label: 'Revenue' },
  { to: '/finance/expenses', label: 'Expenses' },
  { to: '/finance/books', label: 'Books' },
  { to: '/finance/book-sales', label: 'Book Sales' },
  { to: '/finance/payroll', label: 'Payroll' },
  { to: '/finance/reports', label: 'Reports' }
]

export default function FinanceNav() {
  return (
    <nav className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-white text-pink-600 shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
