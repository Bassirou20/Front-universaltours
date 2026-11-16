import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

type Props = { children: React.ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <AlertTriangle size={26} />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            Cette page n'a pas pu s'afficher
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Vos données ne sont pas perdues. Réessayez ; si le problème persiste,
            contactez le support en indiquant le détail ci-dessous.
          </p>
          <details className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            <summary className="cursor-pointer select-none">Détail technique</summary>
            <code className="mt-1 block break-words">{this.state.error.message || 'Erreur inconnue'}</code>
          </details>
        </div>
        <button
          onClick={this.reset}
          className="btn bg-red-500 text-white hover:bg-red-600"
        >
          <RefreshCw size={15} className="mr-2" />
          Réessayer
        </button>
      </div>
    )
  }
}
