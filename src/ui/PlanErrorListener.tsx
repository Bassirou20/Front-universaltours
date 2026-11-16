// src/ui/PlanErrorListener.tsx
import { useEffect, useRef } from 'react'
import { useToast } from './Toasts'

/**
 * Écoute l'event global `ut:plan-error` émis par l'intercepteur axios quand le
 * backend refuse une action pour cause de formule (403) :
 *
 *  - feature_not_in_plan : le module premium n'est pas inclus dans la formule
 *    (ex. Fournisseurs & dépenses hors Standard+) ;
 *  - user_limit_reached  : le quota d'utilisateurs actifs de la formule est
 *    atteint.
 *
 * Affiche un toast « Attention » avec le message renvoyé par le backend (déjà
 * localisé en français) et invite à passer à une formule supérieure.
 *
 * Monté une seule fois, à l'intérieur du ToastProvider (cf main.tsx).
 */
export function PlanErrorListener() {
  const toast = useToast()

  // Anti-spam : on n'affiche pas le même code plus d'une fois par fenêtre
  // courte (plusieurs requêtes peuvent échouer en rafale).
  const lastShownRef = useRef<{ code: string; at: number } | null>(null)

  useEffect(() => {
    const onPlanError = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {}
      const code: string = detail.code ?? 'feature_not_in_plan'
      const message: string | null = detail.message ?? null

      const now = Date.now()
      const last = lastShownRef.current
      if (last && last.code === code && now - last.at < 4000) return
      lastShownRef.current = { code, at: now }

      const title =
        code === 'user_limit_reached'
          ? "Limite d'utilisateurs atteinte"
          : 'Fonctionnalité non incluse'

      toast.push({
        tone: 'warning',
        title,
        description:
          message ??
          "Cette action n'est pas disponible dans votre formule actuelle. " +
            'Passez à une formule supérieure pour y accéder.',
        duration: 6000,
      })
    }

    window.addEventListener('ut:plan-error', onPlanError)
    return () => window.removeEventListener('ut:plan-error', onPlanError)
  }, [toast])

  return null
}

export default PlanErrorListener
