// src/features/superadmin/SuperAdminDashboardPage.tsx
import { money } from '../../lib/helpers'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ShieldAlert, Building2, Users, CalendarCheck, TrendingUp,
  Sparkles, AlertCircle, CheckCircle2, Clock, XCircle,
  ArrowRight, Wallet, FileText,
} from 'lucide-react'
import { api, getImpersonatedAgency } from '../../lib/axios'
import { useAuth } from '../../store/auth'

type PlatformStats = {
  agencies: {
    total: number
    active: number
    trial: number
    suspended: number
    new_this_month: number
  }
  platform: {
    total_users: number
    total_clients: number
    total_reservations: number
    total_factures: number
  }
  revenue: {
    total: number
    monthly: number
    currency: string
  }
}

export default function SuperAdminDashboardPage() {
  const { user } = useAuth()

  // Quitter le mode impersonate au cas où
  useEffect(() => {
    if (getImpersonatedAgency()) {
      localStorage.removeItem('ut_impersonate_agency_id')
    }
  }, [])

  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ['super-admin', 'stats'],
    queryFn: async () => (await api.get('/super-admin/stats')).data,
  })

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <ShieldAlert size={22} className="text-red-600" />
          Vue d'ensemble plateforme
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Pilotage cross-agences. Bienvenue, {user?.prenom || user?.nom || 'Super-Admin'}.
        </p>
      </div>

      {isLoading || !stats ? (
        <div className="py-16 text-center text-gray-400 text-sm">Chargement des stats...</div>
      ) : (
        <>
          {/* ─── KPI principaux ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <BigKpi
              icon={<Building2 size={20} />}
              label="Agences"
              value={stats.agencies.total}
              sub={`${stats.agencies.new_this_month} nouvelle${stats.agencies.new_this_month > 1 ? 's' : ''} ce mois`}
              accent="indigo"
            />
            <BigKpi
              icon={<TrendingUp size={20} />}
              label="CA total"
              value={money(stats.revenue.total)}
              sub={`${money(stats.revenue.monthly)} ce mois`}
              accent="emerald"
            />
            <BigKpi
              icon={<Users size={20} />}
              label="Utilisateurs"
              value={stats.platform.total_users}
              sub={`Sur ${stats.platform.total_clients} clients gérés`}
              accent="sky"
            />
            <BigKpi
              icon={<CalendarCheck size={20} />}
              label="Réservations"
              value={stats.platform.total_reservations}
              sub={`${stats.platform.total_factures} factures émises`}
              accent="amber"
            />
          </div>

          {/* ─── Répartition statuts ─── */}
          <section className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Répartition des agences par statut
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatusCard
                icon={<CheckCircle2 size={16} />}
                label="Actives"
                value={stats.agencies.active}
                total={stats.agencies.total}
                color="emerald"
              />
              <StatusCard
                icon={<Clock size={16} />}
                label="En essai"
                value={stats.agencies.trial}
                total={stats.agencies.total}
                color="blue"
              />
              <StatusCard
                icon={<AlertCircle size={16} />}
                label="Suspendues"
                value={stats.agencies.suspended}
                total={stats.agencies.total}
                color="rose"
              />
              <StatusCard
                icon={<XCircle size={16} />}
                label="Résiliées"
                value={Math.max(0, stats.agencies.total - stats.agencies.active - stats.agencies.trial - stats.agencies.suspended)}
                total={stats.agencies.total}
                color="gray"
              />
            </div>
          </section>

          {/* ─── Quick links ─── */}
          <section className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Accès rapides
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <QuickLink
                to="/super-admin/agencies"
                icon={<Building2 size={18} />}
                title="Gérer les agences"
                description="Liste, créer, suspendre"
              />
              <QuickLink
                to="/super-admin/activity"
                icon={<FileText size={18} />}
                title="Logs cross-agences"
                description="Audit de l'activité globale"
              />
              <QuickLink
                to="/super-admin/revenue"
                icon={<Wallet size={18} />}
                title="Revenu & abonnements"
                description="MRR, croissance, paiements"
              />
            </div>
          </section>

          {/* ─── Note Beta ─── */}
          <div className="text-xs text-gray-400 flex items-center gap-1 justify-center pt-2">
            <Sparkles size={11} />
            Plus de stats et de graphes arrivent bientôt
          </div>
        </>
      )}
    </div>
  )
}

// ─── Composants internes ────────────────────────────────────────────────────

function BigKpi({ icon, label, value, sub, accent }: {
  icon: React.ReactNode
  label: string
  value: number | string
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
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-900 mt-2 truncate">{value}</div>
      <div className="text-[12px] text-gray-500 mt-1">{sub}</div>
    </div>
  )
}

function StatusCard({ icon, label, value, total, color }: {
  icon: React.ReactNode
  label: string
  value: number
  total: number
  color: 'emerald' | 'blue' | 'rose' | 'gray'
}) {
  const colors = {
    emerald: 'text-emerald-700 bg-emerald-50',
    blue: 'text-blue-700 bg-blue-50',
    rose: 'text-rose-700 bg-rose-50',
    gray: 'text-gray-700 bg-gray-100',
  }
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-3">
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[12px] font-semibold ${colors[color]}`}>
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-2">{value}</div>
      <div className="text-[12px] text-gray-500 mt-0.5">{pct}% du total</div>
    </div>
  )
}

function QuickLink({ to, icon, title, description, disabled }: {
  to: string
  icon: React.ReactNode
  title: string
  description: string
  disabled?: boolean
}) {
  const className = `flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 ${
    disabled
      ? 'opacity-50 cursor-not-allowed'
      : 'hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all'
  }`
  const content = (
    <>
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-50 to-rose-50 text-red-700 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
        <div className="text-[12px] text-gray-500 mt-0.5">{description}</div>
      </div>
      {!disabled && <ArrowRight size={14} className="text-gray-300" />}
    </>
  )
  if (disabled) {
    return <div className={className} title="Bientôt disponible">{content}</div>
  }
  return <Link to={to} className={className}>{content}</Link>
}
