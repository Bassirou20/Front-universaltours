// src/ui/TrialBanner.tsx
import { useState } from 'react'
import { Clock, AlertTriangle, X, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useAgency } from '../hooks/useAgency'

/**
 * Bandeau d'essai gratuit.
 *
 * Deux états :
 *  1. Essai EN COURS → bandeau informatif "Il vous reste X jours" (dismissable).
 *     Devient orange/rouge à mesure que l'échéance approche (≤ 3 jours).
 *  2. Essai EXPIRÉ → bandeau bloquant rouge "Votre essai est terminé"
 *     (NON dismissable — l'app est en lecture seule, les mutations sont
 *     refusées côté backend par EnsureSubscriptionActive).
 *
 * Caché pour le super_admin (pas d'essai) et quand l'agence est déjà payante.
 */
export const TRIAL_BANNER_DISMISS_KEY = 'ut_trial_banner_dismissed'

export function TrialBanner({ onDismiss }: { onDismiss?: () => void } = {}) {
  const { user } = useAuth()
  const { agency } = useAgency()
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(TRIAL_BANNER_DISMISS_KEY) === '1'
  )

  if (!user || user.role === 'super_admin') return null
  if (!agency || !agency.is_trial) return null

  const expired = agency.is_trial_expired === true
  const days = agency.days_left_in_trial ?? null

  // ─── Essai expiré : bandeau bloquant, non masquable ───────────────────────
  if (expired) {
    return (
      <div className="bg-red-600 text-white text-xs sm:text-sm px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="truncate">
            <strong>Votre période d'essai gratuit est terminée.</strong>{' '}
            <span className="hidden sm:inline">
              L'application est en lecture seule. Choisissez une formule pour réactiver l'enregistrement de vos données.
            </span>
          </span>
        </div>
        <Link
          to="/agency/abonnement"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-white text-red-700 font-semibold hover:bg-red-50 shrink-0 transition-colors"
        >
          <Sparkles size={13} /> Choisir une formule
        </Link>
      </div>
    )
  }

  // ─── Essai en cours : bandeau informatif (masquable) ──────────────────────
  if (dismissed) return null

  const urgent = days !== null && days <= 3
  const tone = urgent
    ? 'bg-orange-50 border-orange-200 text-orange-900'
    : 'bg-blue-50 border-blue-200 text-blue-900'

  const dismiss = () => {
    sessionStorage.setItem(TRIAL_BANNER_DISMISS_KEY, '1')
    setDismissed(true)
    onDismiss?.()
  }

  const label =
    days === null
      ? "Vous êtes en période d'essai gratuit."
      : days <= 0
      ? "Votre essai se termine aujourd'hui."
      : days === 1
      ? 'Il vous reste 1 jour d\'essai gratuit.'
      : `Il vous reste ${days} jours d'essai gratuit.`

  return (
    <div className={`${tone} border-b text-xs sm:text-sm px-4 py-2 flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-2 min-w-0">
        <Clock size={14} className="shrink-0" />
        <span className="truncate">
          <strong>{label}</strong>{' '}
          <span className="hidden sm:inline">
            Passez à une formule payante pour ne rien perdre à la fin de l'essai.
          </span>
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Link
          to="/agency/abonnement"
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-colors ${
            urgent ? 'bg-orange-100 hover:bg-orange-200' : 'bg-blue-100 hover:bg-blue-200'
          }`}
        >
          <Sparkles size={12} /> Voir les formules
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className={`p-1 rounded ${urgent ? 'hover:bg-orange-100' : 'hover:bg-blue-100'}`}
          title="Masquer pour cette session"
          aria-label="Masquer ce message pour cette session"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
