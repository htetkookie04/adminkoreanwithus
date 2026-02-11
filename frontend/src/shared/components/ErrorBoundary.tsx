import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-xl shadow-lg border border-red-100 p-6">
            <h1 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h1>
            <p className="text-gray-600 text-sm mb-4">
              The app crashed. Check the browser console (F12 → Console) for details, or try refreshing.
            </p>
            <pre className="bg-gray-100 rounded p-3 text-xs text-left overflow-auto max-h-40 mb-4">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
