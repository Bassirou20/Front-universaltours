// src/features/superadmin/SuperAdminRevenuePage.tsx
import { money, formatDateShort } from '../../lib/helpers'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ShieldAlert, TrendingUp, Repeat, CalendarRange, Wallet,
  Building2, CreditCard, Loader2, Sparkles,
} from 'lucide-react'
import { api, getImpersonatedAgency } from '../../lib/axios'

type MonthPoint = {
  month: string
  label: string
  new_agencies: number
  sub_revenue: number
}

type Payment = {
  id: number
  plan: string
  amount: number
  currency: string
  cycle_months: number
  provider: string
  reference: string
  status: string
  paid_at: string | null
  created_at: string
  agency: { id: number; name: string; ref_prefix: string } | null
  initiated_by_user?: { id: number; nom: string; prenom: string } | null
  initiatedBy?: { id: number; nom: string; prenom: string } | null
}

type RevenueData = {
  mrr: number
  arr: number
  active_paying: number
  currency: string
  plan_breakdown: Record<string, number>
  subscription_revenue: { total: number; this_month: number }
  series: MonthPoint[]
  payments: Payment[]
}

const STATUS_COLORS: Record<string, string> = {
  paid:     'bg-emerald-50 text-emerald-700',
  pending:  'bg-amber-50 text-amber-700',
  failed:   'bg-rose-50 text-rose-700',
  canceled: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS: Record<string, string> = {
  paid: 'Payé', pending: 'En attente', failed: 'Échoué', canceled: 'Annulé',
}

export default function SuperAdminRevenuePage() {
  useEffect(() => {
    if (getImpersonatedAgency()) localStorage.removeItem('ut_impersonate_agency_id')
  }, [])

  const { data, isLoading } = useQuery<RevenueData>({
    queryKey: ['super-admin', 'revenue'],
    queryFn: async () => (await api.get('/super-admin/revenue')).data,
  })

  const maxRevenue = data ? Math.max(1, ...data.series.map(s => s.sub_revenue)) : 1
  const maxAgencies = data ? Math.max(1, ...data.series.map(s => s.new_agencies)) : 1

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <ShieldAlert size={22} className="text-red-600" />
          Revenu & abonnements
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          MRR, croissance et historique des paiements d'abonnement de la plateforme.
        </p>
      </div>

      {isLoading || !data ? (
        <div className="py-16 text-center text-gray-400 inline-flex items-center justify-center gap-2 w-full">
          <Loader2 size={16} className="animate-spin" /> Chargement des données…
        </div>
      ) : (
        <>
          {/* KPI revenu récurrent */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={<Repeat size={20} />} label="MRR" value={money(data.mrr)}
                 sub={`${data.active_paying} abonnement${data.active_paying > 1 ? 's' : ''} actif${data.active_paying > 1 ? 's' : ''}`} accent="emerald" />
            <Kpi icon={<CalendarRange size={20} />} label="ARR (annualisé)" value={money(data.arr)}
                 sub="MRR × 12" accent="indigo" />
            <Kpi icon={<Wallet size={20} />} label="Encaissé (total)" value={money(data.subscription_revenue.total)}
                 sub="Tous abonnements payés" accent="sky" />
            <Kpi icon={<TrendingUp size={20} />} label="Encaissé ce mois" value={money(data.subscription_revenue.this_month)}
                 sub={new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} accent="amber" />
          </div>

          {/* Répartition par formule */}
          {Object.keys(data.plan_breakdown).length > 0 && (
            <section className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Abonnements actifs par formule</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.plan_breakdown).map(([plan, count]) => (
                  <div key={plan} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-sm font-semibold">
                    <span className="capitalize">{plan}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white/70 text-xs">{count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Graphes 12 mois */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BarChart title="Revenu d'abonnement (12 mois)" series={data.series}
                      valueOf={(s) => s.sub_revenue} max={maxRevenue}
                      format={money} barClass="bg-emerald-500" />
            <BarChart title="Nouvelles agences (12 mois)" series={data.series}
                      valueOf={(s) => s.new_agencies} max={maxAgencies}
                      format={(n) => String(n)} barClass="bg-indigo-500" />
          </div>

          {/* Derniers paiements */}
          <section className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center gap-2">
              <CreditCard size={16} className="text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Derniers paiements d'abonnement</h2>
            </div>
            {data.payments.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">Aucun paiement enregistré.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/30 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="text-left px-4 py-2.5">Date</th>
                      <th className="text-left px-4 py-2.5">Agence</th>
                      <th className="text-left px-4 py-2.5">Formule</th>
                      <th className="text-right px-4 py-2.5">Montant</th>
                      <th className="text-left px-4 py-2.5">Méthode</th>
                      <th className="text-left px-4 py-2.5">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateShort(p.paid_at || p.created_at)}</td>
                        <td className="px-4 py-3 text-xs">
                          {p.agency ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                              <Building2 size={11} className="text-gray-400" />
                              {p.agency.name}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs capitalize text-gray-600 dark:text-gray-400">
                          {p.plan} · {p.cycle_months}m
                        </td>
                        <td className="px-4 py-3 text-xs text-right font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                          {money(p.amount)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {p.provider === 'manual' ? 'Manuel' : p.provider}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[12px] font-semibold ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABELS[p.status] || p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="text-xs text-gray-400 flex items-center gap-1 justify-center pt-2">
            <Sparkles size={11} />
            MRR estimé à partir des agences actives sur une formule payante.
          </div>
        </>
      )}
    </div>
  )
}

// ─── Composants internes ──────────────────────────────────────────────────────

function Kpi({ icon, label, value, sub, accent }: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent: 'indigo' | 'emerald' | 'sky' | 'amber'
}) {
  const accents = {
    indigo: 'from-indigo-50 to-white text-indigo-700 ring-indigo-100',
    emerald: 'from-emerald-50 to-white text-emerald-700 ring-emerald-100',
    sky: 'from-sky-50 to-white text-sky-700 ring-sky-100',
    amber: 'from-amber-50 to-white text-amber-700 ring-amber-100',
  }
  return (
    <div className={`bg-gradient-to-br ${accents[accent]} ring-1 rounded-2xl p-4`}>
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide">
        {icon}{label}
      </div>
      <div className="text-2xl font-bold text-gray-900 mt-2 truncate">{value}</div>
      <div className="text-[12px] text-gray-500 mt-1">{sub}</div>
    </div>
  )
}

function BarChart({ title, series, valueOf, max, format, barClass }: {
  title: string
  series: MonthPoint[]
  valueOf: (s: MonthPoint) => number
  max: number
  format: (n: number) => string
  barClass: string
}) {
  return (
    <section className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl p-5">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
      <div className="flex items-end justify-between gap-1.5 h-40">
        {series.map((s) => {
          const v = valueOf(s)
          const h = Math.round((v / max) * 100)
          return (
            <div key={s.month} className="flex-1 flex flex-col items-center justify-end h-full group">
              <div className="relative w-full flex justify-center" style={{ height: '100%' }}>
                <div
                  className={`w-full max-w-[26px] rounded-t-md ${barClass} transition-all group-hover:opacity-80`}
                  style={{ height: `${Math.max(v > 0 ? 4 : 0, h)}%`, alignSelf: 'flex-end' }}
                  title={format(v)}
                />
              </div>
              <div className="text-[12px] text-gray-400 mt-1.5 whitespace-nowrap">{s.label}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
