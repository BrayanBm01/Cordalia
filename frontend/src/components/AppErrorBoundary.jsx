import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Error inesperado' }
  }

  componentDidCatch(error, info) {
    console.error('[AppErrorBoundary]', error, info?.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-50 p-6">
          <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border border-dark-100 p-8">
            <div className="text-4xl mb-3">⚠️</div>
            <h1 className="text-lg font-bold text-dark-900 mb-2">Algo salió mal</h1>
            <p className="text-sm text-dark-500 mb-1">Ocurrió un error inesperado en la aplicación.</p>
            <p className="text-xs text-dark-400 mb-6 break-words">{this.state.message}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
              >
                Recargar página
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-dark-200 text-dark-700 hover:bg-dark-50"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}