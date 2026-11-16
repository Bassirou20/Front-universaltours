// src/features/agency/SubscriptionPage.tsx
import { useEffect } from 'react'
import { Check, Sparkles, Clock, AlertTriangle, ShieldCheck, MessageCircle, Mail, CreditCard, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAgency } from '../../hooks/useAgency'
import { api } from '../../lib/axios'
import { useToast } from '../../ui/Toasts'
import { AGENCY, agencyWhatsAppUrl } from '../../lib/agencyConfig'

/**
 * Page Abonnement / Tarifs (côté agence cliente).
 *
 * Informe sur les formules disponibles et met en avant la formule courante.
 * Les formules payantes déclenchent un paiement en ligne (POST /billing/checkout
 * → redirection vers le provider configuré, PayDunya en prod). À son retour, le
 * paramètre ?payment=success confirme l'activation. Enterprise reste sur devis
 * (contact WhatsApp / email).
 */

type Plan = {
  key: string
  name: string
  price: string
  period: string
  tagline: string
  features: string[]
  highlighted?: boolean
}

const PLANS: Plan[] = [
  {
    key: 'starter',
    name: 'Starter',
    price: '15 000',
    period: 'XOF / mois',
    tagline: 'Pour démarrer en solo ou en petite équipe.',
    features: [
      "Jusqu'à 3 utilisateurs",
      'Clients, réservations & factures',
      'Devis et factures PDF',
      'Tableau de bord',
      'Support par email',
    ],
  },
  {
    key: 'standard',
    name: 'Standard',
    price: '30 000',
    period: 'XOF / mois',
    tagline: "L'essentiel pour une agence en croissance.",
    features: [
      "Jusqu'à 10 utilisateurs",
      'Tout le plan Starter',
      'Gestion des fournisseurs & dépenses',
      'Avoirs clients & paiements',
      'Journal d\'activité',
      'Support prioritaire',
    ],
    highlighted: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '50 000',
    period: 'XOF / mois',
    tagline: 'Pour les agences établies et multi-sites.',
    features: [
      'Utilisateurs illimités',
      'Tout le plan Standard',
      'Export de données avancé',
      'Branding personnalisé (logo, couleurs)',
      'Support prioritaire WhatsApp',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Sur devis',
    period: '',
    tagline: 'Besoins spécifiques, intégrations, volumes.',
    features: [
      'Tout le plan Pro',
      'Accompagnement dédié',
      'Intégrations sur mesure',
      'Formation de vos équipes',
      'SLA & support dédié',
    ],
  },
]

const PLAN_LABEL: Record<string, string> = {
  trial: "Essai gratuit",
  starter: 'Starter',
  standard: 'Standard',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

export default function SubscriptionPage() {
  const { agency } = useAgency()
  const toast = useToast()
  const qc = useQueryClient()

  // Retour de paiement : confirme le succès et rafraîchit l'état de l'agence.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      toast.push({ tone: 'success', title: 'Paiement confirmé — abonnement activé !' })
      qc.invalidateQueries({ queryKey: ['agency', 'me'] })
      // Nettoie l'URL pour éviter de re-déclencher au rechargement.
      window.history.replaceState({}, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentPlan = agency?.plan ?? 'trial'
  const isTrial = agency?.is_trial === true
  const trialExpired = agency?.is_trial_expired === true
  const daysLeft = agency?.days_left_in_trial ?? null
  const isActive = agency?.status === 'active'

  const contactMessage = (planName: string) =>
    `Bonjour, je gère l'agence "${agency?.name ?? ''}" sur Itinéo et je souhaite souscrire à la formule ${planName}.`

  // Lance le paiement en ligne (PayDunya) et redirige vers l'URL de checkout.
  const checkout = useMutation({
    mutationFn: async (plan: string) =>
      (await api.post('/billing/checkout', { plan })).data as { checkout_url: string },
    onSuccess: (d) => {
      if (d?.checkout_url) {
        window.location.href = d.checkout_url
      } else {
        toast.push({ tone: 'error', title: 'URL de paiement indisponible. Réessayez.' })
      }
    },
    onError: (e: any) => {
      toast.push({
        tone: 'error',
        title: e?.response?.data?.message || "Impossible d'initier le paiement. Réessayez ou contactez-nous.",
      })
    },
  })
  const pendingPlan = checkout.isPending ? (checkout.variables as string) : null

  return (
    <div className="space-y-6">
      {/* ── En-tête ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Sparkles size={20} style={{ color: 'var(--brand-primary)' }} />
          Abonnement
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Choisissez la formule adaptée à votre agence. Sans engagement, résiliable à tout moment.
        </p>
      </div>

      {/* ── Bandeau état courant ── */}
      <StatusBanner
        isTrial={isTrial}
        trialExpired={trialExpired}
        daysLeft={daysLeft}
        currentPlan={currentPlan}
      />

      {/* ── Grille des formules ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key
          return (
            <div
              key={plan.key}
              className={[
                'relative flex flex-col rounded-xl border p-5 bg-white dark:bg-gray-900 transition-shadow',
                plan.highlighted
                  ? 'border-transparent ring-2 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700',
              ].join(' ')}
              style={plan.highlighted ? { boxShadow: '0 10px 30px -12px var(--brand-primary)', '--tw-ring-color': 'var(--brand-primary)' } as React.CSSProperties : undefined}
            >
              {plan.highlighted && (
                <span
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[12px] font-bold uppercase tracking-wide text-white px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  Le plus choisi
                </span>
              )}
              {isCurrent && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <Check size={10} /> Actuel
                </span>
              )}

              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{plan.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 min-h-[2rem]">{plan.tagline}</p>

              <div className="mt-3 mb-4">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{plan.price}</span>
                {plan.period && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{plan.period}</span>
                )}
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <Check size={13} className="shrink-0 mt-0.5 text-emerald-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {(() => {
                const baseCls = [
                  'mt-5 inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
                  plan.highlighted
                    ? 'text-white hover:opacity-90'
                    : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800',
                ].join(' ')
                const brandStyle = plan.highlighted ? { backgroundColor: 'var(--brand-primary)' } : undefined

                // Formule actuelle d'une agence active (et pas en renouvellement) → état figé
                if (isCurrent && isActive) {
                  return (
                    <span className="mt-5 inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-400">
                      Formule actuelle
                    </span>
                  )
                }

                // Enterprise → contact (sur devis, pas de paiement en ligne)
                if (plan.key === 'enterprise') {
                  return (
                    <a
                      href={agencyWhatsAppUrl(contactMessage(plan.name))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={baseCls}
                      style={brandStyle}
                    >
                      <MessageCircle size={14} />
                      Demander un devis
                    </a>
                  )
                }

                // Plans payants → checkout en ligne
                const isLoading = pendingPlan === plan.key
                return (
                  <button
                    type="button"
                    onClick={() => checkout.mutate(plan.key)}
                    disabled={checkout.isPending}
                    className={baseCls + ' disabled:opacity-60'}
                    style={brandStyle}
                  >
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                    {isCurrent ? 'Renouveler' : 'Souscrire'}
                  </button>
                )
              })()}
            </div>
          )
        })}
      </div>

      {/* ── Aide / contact ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <ShieldCheck size={22} style={{ color: 'var(--brand-primary)' }} className="shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Une question avant de souscrire ?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Notre équipe vous accompagne pour choisir la formule adaptée et migrer vos données.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={agencyWhatsAppUrl("Bonjour, j'ai une question sur les formules Itinéo.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
          <a
            href={`mailto:${AGENCY.email}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            <Mail size={14} /> Email
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Bandeau d'état (essai / expiré / actif) ──────────────────────────────────
function StatusBanner({
  isTrial,
  trialExpired,
  daysLeft,
  currentPlan,
}: {
  isTrial: boolean
  trialExpired: boolean
  daysLeft: number | null
  currentPlan: string
}) {
  if (trialExpired) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-4 flex items-center gap-3">
        <AlertTriangle size={18} className="shrink-0" />
        <p className="text-sm">
          <strong>Votre essai gratuit est terminé.</strong> Votre compte est en lecture seule —
          choisissez une formule ci-dessous pour réactiver l'enregistrement de vos données.
        </p>
      </div>
    )
  }

  if (isTrial) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 text-blue-800 p-4 flex items-center gap-3">
        <Clock size={18} className="shrink-0" />
        <p className="text-sm">
          <strong>
            {daysLeft === null
              ? "Vous êtes en période d'essai gratuit."
              : daysLeft <= 0
              ? "Votre essai se termine aujourd'hui."
              : daysLeft === 1
              ? 'Il vous reste 1 jour d\'essai gratuit.'
              : `Il vous reste ${daysLeft} jours d'essai gratuit.`}
          </strong>{' '}
          Choisissez une formule pour continuer sans interruption à la fin de l'essai.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-4 flex items-center gap-3">
      <Check size={18} className="shrink-0" />
      <p className="text-sm">
        Votre agence est abonnée à la formule{' '}
        <strong>{PLAN_LABEL[currentPlan] ?? currentPlan}</strong>. Merci de votre confiance !
      </p>
    </div>
  )
}
