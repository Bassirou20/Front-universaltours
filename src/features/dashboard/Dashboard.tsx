import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, TooltipProps,
  BarChart, Bar, Cell,
  PieChart, Pie,
} from 'recharts'
import { api } from '../../lib/axios'
import { Link } from 'react-router-dom'
import {
  CalendarCheck, TrendingUp, AlertCircle, Users,
  ArrowUpRight, ArrowDownRight, AlertTriangle,
  ChevronRight, Clock, RefreshCw, Plus,
  FileText, CreditCard, Package, UserPlus,
  Sparkles, PiggyBank,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type DashboardPayload = {
  kpis?: {
    reservations_7d?: number
    ca_month?: number
    follow_count?: number
    clients_total?: number
    new_clients_month?: number
    range?: { start7?: string; start30?: string; monthStart?: string; monthEnd?: string }
  }
  series?: {
    reservations_7d?: Array<{ date: string; label: string; value: number }>
    ca_30d?: Array<{ date: string; label: string; value: number }>
    ca_12_mois?: Array<{ mois: string; label: string; value: number }>
  }
  charts?: {
    repartition_par_type?: Array<{ type: string; label: string; value: number }>
  }
  lists?: {
    last_reservations?: Array<{
      id: number; created_at?: string; statut?: string; reference?: string
      client?: { prenom?: string; nom?: string; email?: string }
    }>
    factures_follow?: Array<{
      id: number; numero?: string; statut?: string; montant_total?: number; created_at?: string
      reservation?: { id?: number; reference?: string; client?: { prenom?: string; nom?: string } }
    }>
    top_clients?: Array<{
      id: number; nom?: string; prenom?: string; email?: string
      nb_reservations?: number; ca_total?: number
    }>
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('fr-FR')
const moneyXOF = (n: unknown) => `${fmt(Number(n || 0))} XOF`
const moneyShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function initials(prenom?: string | null, nom?: string | null) {
  const a = (prenom ?? '').trim()[0] ?? ''
  const b = (nom ?? '').trim()[0] ?? ''
  return (a + b).toUpperCase() || '??'
}

function safeDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUT_RESERVATION: Record<string, { label: string; cls: string }> = {
  confirmee:  { label: 'Confirmée',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  annulee:    { label: 'Annulée',    cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  brouillon:  { label: 'Brouillon',  cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300' },
  en_attente: { label: 'En attente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
}

const STATUT_FACTURE: Record<string, { label: string; cls: string }> = {
  emis:              { label: 'Émise',     cls: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  impayee:           { label: 'Impayée',   cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  partielle:         { label: 'Partielle', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  paye_partiellement:{ label: 'Partielle', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  payee:             { label: 'Payée',     cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  annule:            { label: 'Annulée',   cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300' },
}

const TYPE_COLORS: Record<string, string> = {
  billet_avion: '#38bdf8',
  hotel:        '#34d399',
  voiture:      '#fb923c',
  evenement:    '#a78bfa',
  forfait:      '#f472b6',
  assurance:    '#facc15',
  evisa:        '#2dd4bf',
}

function StatutBadge({ statut, map }: { statut?: string | null; map: typeof STATUT_RESERVATION }) {
  const cfg = map[statut ?? ''] ?? { label: statut || '—', cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-black/[0.06] dark:bg-white/[0.07] ${className}`} />
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, money }: TooltipProps<number, string> & { money?: boolean }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c2535] shadow-xl px-3 py-2 text-sm">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className="font-semibold text-gray-900 dark:text-gray-100">
        {money ? moneyXOF(payload[0].value) : payload[0].value}
      </div>
    </div>
  )
}

// ─── Sparkline (mini bar chart for KPI card) ─────────────────────────────────

function Sparkline({ data, color }: { data: Array<{ value: number }>; color: string }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-[2px] h-8">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{
            height: `${Math.max(10, (d.value / max) * 100)}%`,
            background: color,
            opacity: i === data.length - 1 ? 1 : 0.35 + (i / data.length) * 0.45,
          }}
        />
      ))}
    </div>
  )
}


// ─── KPI Card ─────────────────────────────────────────────────────────────────

type KpiCardProps = {
  label: string
  value: React.ReactNode
  sub: string
  icon: React.ReactNode
  iconBg: string
  accent: string
  sparkData?: Array<{ value: number }>
  sparkColor?: string
  trend?: { value: number; positive: boolean; label?: string }
  to?: string
}

function KpiCard({ label, value, sub, icon, iconBg, accent, sparkData, sparkColor, trend, to }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] shadow-sm hover:shadow-md transition-shadow group">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accent}`} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</div>
            <div className="mt-2 text-[1.7rem] font-bold leading-none text-gray-900 dark:text-gray-50 truncate">
              {value}
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 dark:text-gray-500">{sub}</span>
              {trend && (
                <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  trend.positive
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                }`}>
                  {trend.positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {trend.label ?? trend.value}
                </span>
              )}
            </div>
          </div>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
            {icon}
          </div>
        </div>

        {sparkData && sparkData.length > 0 && sparkColor && (
          <div className="mt-4">
            <Sparkline data={sparkData} color={sparkColor} />
          </div>
        )}
      </div>

      {to && (
        <Link
          to={to}
          className="flex items-center justify-between px-5 py-1.5 border-t border-black/5 dark:border-white/[0.06] text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/60 dark:hover:bg-white/[0.03] transition-all group/footer"
        >
          <span>Voir détails</span>
          <ChevronRight size={13} className="group-hover/footer:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  )
}

// ─── Quick Action button ──────────────────────────────────────────────────────

function QuickAction({ to, icon, label, sub, color }: { to: string; icon: React.ReactNode; label: string; sub: string; color: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] px-4 py-3 hover:shadow-md hover:border-black/10 dark:hover:border-white/15 transition-all"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color} transition-transform group-hover:scale-105`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">{label}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{sub}</div>
      </div>
      <ChevronRight size={14} className="ml-auto shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" />
    </Link>
  )
}

// ─── Hero banner ─────────────────────────────────────────────────────────────

type HeroBannerProps = { caMonth: number; r7: number; clientsTotal: number; followCount: number; loading: boolean }

function HeroBanner({ caMonth, r7, clientsTotal, followCount, loading }: HeroBannerProps) {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const stats = [
    { label: 'Réservations (7j)', value: fmt(r7), color: 'text-sky-300' },
    { label: 'Clients total', value: fmt(clientsTotal), color: 'text-violet-300' },
    { label: 'Factures à suivre', value: fmt(followCount), color: followCount > 0 ? 'text-amber-300' : 'text-emerald-300' },
    { label: `Jour ${dayOfMonth} / ${daysInMonth}`, value: `${Math.round((dayOfMonth / daysInMonth) * 100)}%`, color: 'text-gray-300' },
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 dark:border-white/[0.08] bg-gradient-to-br from-[#0f1929] via-[#111827] to-[#0c1320] shadow-lg p-4">
      <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* CA principal */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-sky-400" />
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-widest">Chiffre d'affaires</span>
            <span className="text-xs text-gray-500 capitalize">· {monthLabel}</span>
          </div>
          {loading
            ? <Skeleton className="h-10 w-52 bg-white/10" />
            : <div className="text-2xl font-extrabold text-white leading-none tracking-tight">{moneyXOF(caMonth)}</div>
          }
          <div className="mt-2 text-xs text-gray-500">Factures payées ce mois</div>
        </div>

        {/* Séparateur */}
        <div className="hidden sm:block w-px self-stretch bg-white/[0.08]" />

        {/* Mini stats */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:gap-y-4">
          {stats.map((s) => (
            <div key={s.label}>
              <div className={`text-lg font-bold leading-none ${loading ? 'opacity-0' : s.color}`}>{s.value}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const q = useQuery({
    queryKey: ['dashboard-v1'],
    queryFn: async () => {
      const { data } = await api.get<DashboardPayload>('/dashboard')
      return data
    },
    staleTime: 30_000,
  })

  const d = q.data

  const kpis = {
    r7:              Number(d?.kpis?.reservations_7d ?? 0),
    caMonth:         Number(d?.kpis?.ca_month ?? 0),
    followCount:     Number(d?.kpis?.follow_count ?? 0),
    clientsTotal:    Number(d?.kpis?.clients_total ?? 0),
    newClientsMonth: Number(d?.kpis?.new_clients_month ?? 0),
  }

  const chartR7      = useMemo(() => d?.series?.reservations_7d ?? [], [d])
  const chartCA      = useMemo(() => d?.series?.ca_30d ?? [], [d])
  const chartCA12    = useMemo(() => d?.series?.ca_12_mois ?? [], [d])
  const repartition  = useMemo(() => d?.charts?.repartition_par_type ?? [], [d])
  const lastRes      = useMemo(() => d?.lists?.last_reservations ?? [], [d])
  const followTop    = useMemo(() => d?.lists?.factures_follow ?? [], [d])
  const topClients   = useMemo(() => d?.lists?.top_clients ?? [], [d])

  const overdueCount = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    return followTop.filter(f => f.created_at && new Date(f.created_at).getTime() < cutoff).length
  }, [followTop])

  const caTotal = useMemo(() => chartCA.reduce((s, p) => s + (p.value || 0), 0), [chartCA])
  const r7Total = useMemo(() => chartR7.reduce((s, p) => s + (p.value || 0), 0), [chartR7])

  const loading = q.isLoading
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {greeting()} 👋
          </h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500 capitalize">{today}</p>
        </div>

        <div className="flex items-center gap-2">
          {q.isFetching && !loading && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <RefreshCw size={12} className="animate-spin" /> Actualisation…
            </span>
          )}
          <Link
            to="/reservations"
            className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm"
          >
            Voir réservations
          </Link>
          <Link
            to="/reservations"
            className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition shadow-sm"
          >
            <Plus size={15} /> Nouvelle réservation
          </Link>
        </div>
      </div>

      {/* ── Alert overdue ──────────────────────────────────────────────────── */}
      {!loading && overdueCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {overdueCount} facture{overdueCount > 1 ? 's' : ''} impayée{overdueCount > 1 ? 's' : ''} depuis plus de 30 jours
            </span>
            <span className="ml-2 text-xs text-amber-700/70 dark:text-amber-400/70">Relancez vos clients.</span>
          </div>
          <Link
            to="/factures?follow=1"
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
          >
            Voir <ChevronRight size={13} />
          </Link>
        </div>
      )}

      {/* ── Hero revenue ring ───────────────────────────────────────────────── */}
      <HeroBanner caMonth={kpis.caMonth} r7={kpis.r7} clientsTotal={kpis.clientsTotal} followCount={kpis.followCount} loading={loading} />

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] p-4 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Réservations"
            value={fmt(kpis.r7)}
            sub="7 derniers jours"
            icon={<CalendarCheck size={22} className="text-sky-600 dark:text-sky-400" />}
            iconBg="bg-sky-100 dark:bg-sky-500/15"
            accent="bg-gradient-to-r from-sky-400 to-sky-600"
            sparkData={chartR7.slice(-7)}
            sparkColor="#38bdf8"
            trend={kpis.r7 > 0 ? { value: kpis.r7, positive: true, label: `+${kpis.r7}` } : undefined}
            to="/reservations"
          />
          <KpiCard
            label="CA du mois"
            value={<span className="text-[1.35rem]">{moneyShort(kpis.caMonth)}</span>}
            sub="Factures payées"
            icon={<TrendingUp size={22} className="text-emerald-600 dark:text-emerald-400" />}
            iconBg="bg-emerald-100 dark:bg-emerald-500/15"
            accent="bg-gradient-to-r from-emerald-400 to-emerald-600"
            sparkData={chartCA.slice(-14)}
            sparkColor="#34d399"
            to="/factures"
          />
          <KpiCard
            label="À suivre"
            value={fmt(kpis.followCount)}
            sub="Impayées / partielles"
            icon={<AlertCircle size={22} className="text-amber-600 dark:text-amber-400" />}
            iconBg="bg-amber-100 dark:bg-amber-500/15"
            accent={kpis.followCount > 0
              ? 'bg-gradient-to-r from-amber-400 to-amber-600'
              : 'bg-gradient-to-r from-gray-200 to-gray-300 dark:from-white/10 dark:to-white/5'}
            trend={overdueCount > 0 ? { value: overdueCount, positive: false, label: `${overdueCount} en retard` } : undefined}
            to="/factures"
          />
          <KpiCard
            label="Clients"
            value={fmt(kpis.clientsTotal)}
            sub={`+${kpis.newClientsMonth} ce mois`}
            icon={<Users size={22} className="text-violet-600 dark:text-violet-400" />}
            iconBg="bg-violet-100 dark:bg-violet-500/15"
            accent="bg-gradient-to-r from-violet-400 to-violet-600"
            trend={kpis.newClientsMonth > 0 ? { value: kpis.newClientsMonth, positive: true, label: `+${kpis.newClientsMonth}` } : undefined}
            to="/clients"
          />
        </div>
      )}

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Actions rapides</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction
            to="/reservations"
            icon={<CalendarCheck size={18} className="text-sky-600 dark:text-sky-400" />}
            label="Réservation"
            sub="Nouvelle réservation"
            color="bg-sky-100 dark:bg-sky-500/15"
          />
          <QuickAction
            to="/factures"
            icon={<FileText size={18} className="text-emerald-600 dark:text-emerald-400" />}
            label="Facture"
            sub="Créer une facture"
            color="bg-emerald-100 dark:bg-emerald-500/15"
          />
          <QuickAction
            to="/avoirs"
            icon={<PiggyBank size={18} className="text-amber-600 dark:text-amber-400" />}
            label="Avoir"
            sub="Dépôt client"
            color="bg-amber-100 dark:bg-amber-500/15"
          />
          <QuickAction
            to="/clients"
            icon={<UserPlus size={18} className="text-violet-600 dark:text-violet-400" />}
            label="Client"
            sub="Ajouter un client"
            color="bg-violet-100 dark:bg-violet-500/15"
          />
        </div>
      </div>

      {/* ── Charts ─────────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Chart 1 — Réservations 7j */}
        <div className="rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-sky-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Réservations</span>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-4">7 derniers jours</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-sky-600 dark:text-sky-400">{fmt(r7Total)}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">total semaine</div>
            </div>
          </div>

          <div className="h-52 px-2 pb-4">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartR7} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.45 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.45 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={(p: any) => <ChartTooltip {...p} />} />
                  <Area type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2.5} fill="url(#gradSky)"
                    dot={{ r: 3.5, fill: '#38bdf8', strokeWidth: 0 }}
                    activeDot={{ r: 5.5, fill: '#38bdf8', strokeWidth: 2.5, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2 — CA 30j */}
        <div className="rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Chiffre d'affaires</span>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-4">30 derniers jours</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{moneyShort(caTotal)}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">XOF total</div>
            </div>
          </div>

          <div className="h-52 px-2 pb-4">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartCA} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.45 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.45 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  />
                  <Tooltip content={(p: any) => <ChartTooltip {...p} money />} />
                  <Area type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2.5} fill="url(#gradGreen)"
                    dot={false}
                    activeDot={{ r: 5.5, fill: '#34d399', strokeWidth: 2.5, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── CA 12 mois + Répartition par type ─────────────────────────────── */}
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">

        {/* CA mensuel 12 mois */}
        <div className="rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">CA mensuel</span>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-4">12 derniers mois · factures payées</div>
            </div>
          </div>
          <div className="h-52 px-2 pb-4">
            {loading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartCA12} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.45 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.45 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                  />
                  <Tooltip content={(p: any) => <ChartTooltip {...p} money />} />
                  <Bar dataKey="value" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Répartition par type */}
        <div className="rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Réservations par type</span>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-4">12 derniers mois</div>
          </div>
          {loading ? (
            <div className="h-52 px-5 pb-4"><Skeleton className="h-full w-full" /></div>
          ) : repartition.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-sm text-gray-400">Aucune donnée</div>
          ) : (
            <div className="flex flex-col gap-0 px-5 pb-4 mt-2">
              {/* Mini donut */}
              <div className="flex justify-center">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={repartition} dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={52} strokeWidth={2} stroke="transparent">
                      {repartition.map((entry) => (
                        <Cell key={entry.type} fill={TYPE_COLORS[entry.type] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, _: any, p: any) => [v, p.payload?.label]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Légende */}
              <div className="space-y-1.5 mt-1">
                {repartition.map((item) => {
                  const total = repartition.reduce((s, r) => s + r.value, 0)
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                  return (
                    <div key={item.type} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: TYPE_COLORS[item.type] ?? '#94a3b8' }} />
                      <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">{item.label}</span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{item.value}</span>
                      <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Top clients ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/[0.06]">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top clients</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Par chiffre d'affaires total</div>
          </div>
          <Link to="/clients" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline">
            Voir tous <ChevronRight size={12} />
          </Link>
        </div>
        {loading ? (
          <div className="divide-y divide-black/5 dark:divide-white/[0.06]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-2 w-20" /></div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : topClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-sm text-gray-400">Aucun client trouvé</div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/[0.06]">
            {topClients.map((c, idx) => {
              const nom = [c.prenom, c.nom].filter(Boolean).join(' ') || c.email || `Client #${c.id}`
              const ini = initials(c.prenom, c.nom)
              const medal = ['🥇', '🥈', '🥉'][idx] ?? null
              const maxCA = topClients[0]?.ca_total ?? 1
              const pct = maxCA > 0 ? Math.round(((c.ca_total ?? 0) / maxCA) * 100) : 0
              return (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/80 dark:hover:bg-white/[0.025] transition-colors">
                  <div className="h-8 w-8 shrink-0 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-[11px] font-bold text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-500/20">
                    {ini}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {medal && <span className="text-[13px] leading-none">{medal}</span>}
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{nom}</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden w-32">
                      <div className="h-full rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{moneyShort(c.ca_total ?? 0)}</div>
                    <div className="text-[10px] text-gray-400">{c.nb_reservations} rés.</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Lists ──────────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Dernières réservations */}
        <div className="rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/[0.06]">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Dernières réservations</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lastRes.length} récentes</div>
            </div>
            <Link to="/reservations" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline">
              Tout voir <ChevronRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-black/5 dark:divide-white/[0.06]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : lastRes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-5">
              <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                <CalendarCheck size={20} className="text-gray-300 dark:text-gray-600" />
              </div>
              <div className="text-sm font-medium text-gray-400">Aucune réservation récente</div>
            </div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/[0.06]">
              {lastRes.map((r) => {
                const nom = [r.client?.prenom, r.client?.nom].filter(Boolean).join(' ') || r.client?.email || '—'
                const ini = initials(r.client?.prenom, r.client?.nom)
                return (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 dark:hover:bg-white/[0.025] transition-colors">
                    <div className="h-9 w-9 shrink-0 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-[11px] font-bold text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-500/20">
                      {ini}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{nom}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                        <Clock size={10} />
                        <span>{safeDate(r.created_at)}</span>
                        {r.reference && <>
                          <span className="text-gray-200 dark:text-gray-700">·</span>
                          <span className="font-mono text-gray-400 dark:text-gray-500">{r.reference}</span>
                        </>}
                      </div>
                    </div>
                    <StatutBadge statut={r.statut} map={STATUT_RESERVATION} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Factures à suivre */}
        <div className="rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/[0.06]">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Factures à suivre</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Impayées · partielles</div>
            </div>
            <Link to="/factures" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline">
              Tout voir <ChevronRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-black/5 dark:divide-white/[0.06]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                  <div className="text-right space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-14 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : followTop.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-3">
                <TrendingUp size={20} className="text-emerald-500" />
              </div>
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">Tout est à jour 🎉</div>
              <div className="text-xs text-gray-400 mt-1">Aucune facture impayée.</div>
            </div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/[0.06]">
              {followTop.map((f) => {
                const client = f.reservation?.client
                const nom = client ? [client.prenom, client.nom].filter(Boolean).join(' ') : null
                const ini = client ? initials(client.prenom, client.nom) : '??'
                const days = f.created_at ? Math.floor((Date.now() - new Date(f.created_at).getTime()) / 86400000) : null
                const overdue = (days ?? 0) > 30
                return (
                  <div key={f.id} className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 dark:hover:bg-white/[0.025] transition-colors ${overdue ? 'bg-red-50/30 dark:bg-red-500/[0.04]' : ''}`}>
                    <div className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-[11px] font-bold border ${
                      overdue
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-100 dark:border-red-500/20'
                        : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-500/20'
                    }`}>
                      {ini}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {nom ?? (f.numero ?? `Facture #${f.id}`)}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                        {nom && <span className="font-mono text-gray-400 dark:text-gray-500 truncate max-w-[100px]">{f.numero ?? `#${f.id}`}</span>}
                        {days !== null && (
                          <span className={`flex items-center gap-0.5 ${overdue ? 'text-red-500 dark:text-red-400 font-bold' : 'text-gray-400'}`}>
                            <Clock size={10} /> {days}j
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{moneyXOF(f.montant_total)}</div>
                      <StatutBadge statut={f.statut} map={STATUT_FACTURE} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────────── */}
      {q.isError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle size={16} className="shrink-0" />
          Impossible de charger le dashboard. Vérifiez l'endpoint <code className="mx-1 font-mono text-xs">/dashboard</code> côté API.
        </div>
      )}
    </div>
  )
}
