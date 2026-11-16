// src/ui/AppNotices.tsx
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../store/auth'
import { useRole } from '../hooks/useRole'
import { useAgency } from '../hooks/useAgency'
import { EmailVerificationBanner, EMAIL_BANNER_DISMISS_KEY } from './EmailVerificationBanner'
import { TrialBanner, TRIAL_BANNER_DISMISS_KEY } from './TrialBanner'

const isDismissed = (key: string) => {
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

/**
 * Affiche AU PLUS UN bandeau d'information au-dessus de la barre supérieure,
 * pour ne pas repousser le contenu de la page. Ordre de priorité :
 *
 *  1. essai expiré (bloquant, non masquable)
 *  2. essai qui se termine dans 3 jours ou moins
 *  3. email à vérifier
 *  4. essai en cours (simple information)
 *
 * Quand l'utilisateur masque un bandeau, le suivant dans l'ordre prend sa place.
 */
export function AppNotices() {
  const { user } = useAuth()
  const { isSuperAdmin } = useRole()
  const { agency } = useAgency()
  const qc = useQueryClient()

  // Incrémenté quand un bandeau est masqué, pour relire sessionStorage.
  const [, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)

  // Si une mutation est refusée (essai expiré), on resynchronise l'agence pour
  // faire apparaître le bandeau bloquant immédiatement. Écouté ici, et non dans
  // TrialBanner, car ce dernier n'est pas toujours monté.
  useEffect(() => {
    const onExpired = () => qc.invalidateQueries({ queryKey: ['agency', 'me'] })
    window.addEventListener('ut:trial-expired', onExpired)
    return () => window.removeEventListener('ut:trial-expired', onExpired)
  }, [qc])

  if (!user || isSuperAdmin) return null

  const emailPending =
    !(user as any).email_verified_at && !isDismissed(EMAIL_BANNER_DISMISS_KEY)

  const inTrial = !!agency?.is_trial
  const trialExpired = inTrial && agency?.is_trial_expired === true
  const days = agency?.days_left_in_trial ?? null
  const trialInfoVisible = inTrial && !trialExpired && !isDismissed(TRIAL_BANNER_DISMISS_KEY)
  const trialUrgent = trialInfoVisible && days !== null && days <= 3

  if (trialExpired) return <TrialBanner />
  if (trialUrgent) return <TrialBanner onDismiss={refresh} />
  if (emailPending) return <EmailVerificationBanner onDismiss={refresh} />
  if (trialInfoVisible) return <TrialBanner onDismiss={refresh} />
  return null
}

export default AppNotices
