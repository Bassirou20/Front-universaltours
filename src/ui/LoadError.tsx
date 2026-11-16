// src/ui/LoadError.tsx
import React from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

/**
 * État « le chargement a échoué » pour une liste ou un bloc de données.
 * À afficher à la place d'un état vide quand la requête est en erreur :
 * une liste vide laisserait croire qu'il n'y a aucune donnée.
 */
export const LoadError: React.FC<{
  /** Ce qui n'a pas pu être chargé, ex. « les dépenses ». */
  what?: string
  onRetry?: () => void
  className?: string
}> = ({ what = 'les données', onRetry, className = '' }) => (
  <div
    role="alert"
    className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 px-6 py-10 text-center ${className}`}
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
      <WifiOff size={22} />
    </div>
    <div>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Impossible de charger {what}
      </p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Vérifiez votre connexion, puis réessayez.
      </p>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="btn bg-gray-900 text-white hover:bg-gray-800 dark:bg-white/10 dark:hover:bg-white/15"
      >
        <RefreshCw size={14} className="mr-2" />
        Réessayer
      </button>
    )}
  </div>
)

export default LoadError
