// src/features/dashboard/OnboardingChecklist.tsx
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Rocket, Check, ChevronRight, X,
  MailCheck, Palette, UserPlus, CalendarCheck,
} from 'lucide-react'
import { useAuth } from '../../store/auth'
import { useAgency } from '../../hooks/useAgency'

const HIDE_KEY = 'ut_onboarding_hidden'

type Step = {
  key: string
  label: string
  desc: string
  done: boolean
  to: string
  cta: string
  icon: React.ReactNode
}

/**
 * Checklist « Premiers pas » affichée sur le dashboard d'une nouvelle agence.
 *
 * - Réservée aux rôles owner/admin (configuration du compte).
 * - Se masque automatiquement quand toutes les étapes sont faites,
 *   ou si l'utilisateur clique sur « Masquer » (mémorisé en localStorage).
 * - S'appuie sur des données déjà présentes (pas d'appel API supplémentaire).
 */
export function OnboardingChecklist({
  clientsTotal,
  hasReservation,
}: {
  clientsTotal: number
  hasReservation: boolean
}) {
  const { user } = useAuth()
  const { agency } = useAgency()
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDE_KEY) === '1')

  const emailVerified = !!(user as any)?.email_verified_at
  const hasLogo = !!agency?.logo_url

  const steps: Step[] = useMemo(() => [
    {
      key: 'email',
      label: 'Vérifiez votre email',
      desc: "Confirmez votre adresse via le lien reçu par email.",
      done: emailVerified,
      to: '/profile',
      cta: 'Vérifier',
      icon: <MailCheck size={16} />,
    },
    {
      key: 'branding',
      label: 'Personnalisez votre agence',
      desc: 'Ajoutez votre logo et votre couleur pour vos documents.',
      done: hasLogo,
      to: '/agency/settings',
      cta: 'Configurer',
      icon: <Palette size={16} />,
    },
    {
      key: 'client',
      label: 'Ajoutez votre premier client',
      desc: 'Créez une fiche client pour démarrer.',
      done: clientsTotal > 0,
      to: '/clients',
      cta: 'Ajouter',
      icon: <UserPlus size={16} />,
    },
    {
      key: 'reservation',
      label: 'Créez votre première réservation',
      desc: 'Billet, hôtel, forfait… enregistrez une vente.',
      done: hasReservation,
      to: '/reservations',
      cta: 'Créer',
      icon: <CalendarCheck size={16} />,
    },
  ], [emailVerified, hasLogo, clientsTotal, hasReservation])

  const doneCount = steps.filter(s => s.done).length
  const total = steps.length
  const allDone = doneCount === total
  const pct = Math.round((doneCount / total) * 100)

  // Réservé owner/admin ; caché si masqué ou si tout est terminé.
  const role = user?.role
  if (role !== 'owner' && role !== 'admin') return null
  if (hidden || allDone) return null

  const hide = () => {
    localStorage.setItem(HIDE_KEY, '1')
    setHidden(true)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] shadow-sm">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--ut-orange,#F07A1C)] to-[#c84a14]" />

      <div className="p-5">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400">
              <Rocket size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Premiers pas</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Configurez votre agence en quelques minutes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={hide}
            className="p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors shrink-0"
            title="Masquer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Progression */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--ut-orange,#F07A1C)] to-[#c84a14] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">
            {doneCount}/{total}
          </span>
        </div>

        {/* Étapes */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {steps.map((s) => (
            <div
              key={s.key}
              className={[
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                s.done
                  ? 'border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.06]'
                  : 'border-black/5 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02]',
              ].join(' ')}
            >
              <div
                className={[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  s.done
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white dark:bg-white/5 text-gray-400 border border-black/5 dark:border-white/10',
                ].join(' ')}
              >
                {s.done ? <Check size={16} className="stroke-[3]" /> : s.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold truncate ${s.done ? 'text-emerald-700 dark:text-emerald-300 line-through decoration-1' : 'text-gray-900 dark:text-gray-100'}`}>
                  {s.label}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{s.desc}</div>
              </div>

              {!s.done && (
                <Link
                  to={s.to}
                  className="shrink-0 inline-flex items-center gap-0.5 rounded-lg bg-[var(--ut-orange,#F07A1C)] px-2.5 py-1 text-xs font-semibold text-white hover:brightness-95 transition"
                >
                  {s.cta} <ChevronRight size={12} />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
