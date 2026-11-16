// src/ui/EmailVerificationBanner.tsx
import { useState } from 'react'
import { Mail, X, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../store/auth'
import { api } from '../lib/axios'
import { useToast } from './Toasts'

/**
 * Banner affiché en haut de l'app quand le user n'a pas encore vérifié son email.
 * Disparaît une fois l'email vérifié (email_verified_at != null).
 * Permet de renvoyer l'email de vérification (rate-limité côté backend).
 */
export const EMAIL_BANNER_DISMISS_KEY = 'ut_email_banner_dismissed'

export function EmailVerificationBanner({ onDismiss }: { onDismiss?: () => void } = {}) {
  const { user } = useAuth()
  const toast = useToast()
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(EMAIL_BANNER_DISMISS_KEY) === '1'
  )
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Caché si :
  // - pas de user (logout)
  // - email déjà vérifié
  // - super_admin (pas de vérif requise pour le super-admin)
  // - dismissed cette session
  if (!user) return null
  if ((user as any).email_verified_at) return null
  if (user.role === 'super_admin') return null
  if (dismissed) return null

  const dismiss = () => {
    sessionStorage.setItem(EMAIL_BANNER_DISMISS_KEY, '1')
    setDismissed(true)
    onDismiss?.()
  }

  const resend = async () => {
    if (sending) return
    setSending(true)
    try {
      const r = await api.post('/email/resend-verification')
      toast.push({ tone: 'success', title: r.data?.message || 'Email de vérification renvoyé.' })
      setSent(true)
    } catch (e: any) {
      const status = e?.response?.status
      const msg = status === 429
        ? 'Trop de tentatives. Patientez une minute avant de réessayer.'
        : (e?.response?.data?.message || "Échec de l'envoi. Réessayez plus tard.")
      toast.push({ tone: 'error', title: msg })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Mail size={14} className="shrink-0" />
        <span className="truncate">
          <strong>Vérifiez votre email</strong> — un lien de confirmation a été envoyé à <strong>{user.email}</strong>.
          Pensez à vérifier votre boîte (et vos spams).
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {sent ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-emerald-700 font-medium">
            <CheckCircle2 size={12} /> Renvoyé
          </span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={sending}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 font-semibold disabled:opacity-60 transition-colors"
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
            {sending ? 'Envoi…' : "Renvoyer l'email"}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="p-1 rounded hover:bg-amber-100"
          title="Masquer pour cette session"
          aria-label="Masquer ce message pour cette session"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
