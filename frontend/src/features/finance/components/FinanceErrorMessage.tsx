import { AlertCircle } from 'lucide-react'

interface FinanceErrorMessageProps {
  title?: string
  message?: string
  statusCode?: number
}

export default function FinanceErrorMessage({
  title = 'Unable to load Finance',
  message,
  statusCode
}: FinanceErrorMessageProps) {
  return (
    <div className="card max-w-2xl mx-auto p-8 text-center">
      <div className="flex justify-center mb-4">
        <AlertCircle className="w-16 h-16 text-amber-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      {message && (
        <p className="text-gray-600 mb-4">{message}</p>
      )}
      {statusCode === 403 && (
        <p className="text-gray-600 mb-4">Your role does not have access to the Finance module.</p>
      )}
      {statusCode === 404 && (
        <p className="text-gray-600 mb-4">
          Finance API not found. Restart the backend server so the Finance routes are loaded, then refresh.
        </p>
      )}
      {(statusCode === 500 || statusCode === undefined) && (
        <>
          <p className="text-gray-600 mb-4">
            The Finance module may not be set up yet. Run these in the <strong>backend</strong> folder:
          </p>
          <ol className="text-left text-sm text-gray-700 bg-gray-50 rounded-xl p-6 space-y-2 list-decimal list-inside">
            <li>Apply the database migration: <code className="bg-white px-2 py-1 rounded">npx prisma migrate deploy</code></li>
            <li>Regenerate Prisma client: <code className="bg-white px-2 py-1 rounded">npx prisma generate</code></li>
            <li>Seed finance categories: <code className="bg-white px-2 py-1 rounded">npx prisma db seed</code></li>
          </ol>
          <p className="text-sm text-gray-500 mt-4">Then restart the backend server and refresh this page.</p>
        </>
      )}
    </div>
  )
}
