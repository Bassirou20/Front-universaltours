import React, { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useDebouncedValue, normalizePaged } from '../../lib/helpers'
import { Pagination } from '../../ui/Pagination'
import { DatePickerInput } from '../../ui/DatePickerInput'
import {
  Activity, Plus, Pencil, Trash2, LogIn, LogOut,
  Search, Loader2, Filter, ChevronDown, User,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type ActivityLog = {
  id: number
  user_id: number | null
  action: 'created' | 'updated' | 'deleted' | 'login' | 'logout'
  model_type: string | null
  model_id: number | null
  description: string
  changes: Record<string, { avant: unknown; apres: unknown }> | null
  ip_address: string | null
  created_at: string
  user?: { id: number; nom: string; prenom: string; email: string } | null
}

// ─── Config actions ───────────────────────────────────────────────────────────

const ACTION_CONFIG = {
  created: {
    label: 'Création',
    icon: Plus,
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20',
  },
  updated: {
    label: 'Modification',
    icon: Pencil,
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20',
  },
  deleted: {
    label: 'Suppression',
    icon: Trash2,
    dot: 'bg-red-500',
    badge: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20',
  },
  login: {
    label: 'Connexion',
    icon: LogIn,
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20',
  },
  logout: {
    label: 'Déconnexion',
    icon: LogOut,
    dot: 'bg-gray-400',
    badge: 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10',
  },
} as const

const MODEL_LABELS: Record<string, string> = {
  Client: 'Client',
  Facture: 'Facture',
  Reservation: 'Réservation',
  Depense: 'Dépense',
  Paiement: 'Paiement',
  ClientAvoir: 'Avoir',
  Forfait: 'Forfait',
  Produit: 'Service',
}

const ACTIONS = ['created', 'updated', 'deleted', 'login', 'logout'] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return "À l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `Il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Hier'
  if (d < 7) return `Il y a ${d} j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function userName(log: ActivityLog): string {
  if (!log.user) return 'Système'
  const { prenom, nom } = log.user
  return [prenom, nom].filter(Boolean).join(' ') || log.user.email
}

function userInitials(log: ActivityLog): string {
  if (!log.user) return 'SY'
  const a = (log.user.prenom ?? '').trim()[0] ?? ''
  const b = (log.user.nom ?? '').trim()[0] ?? ''
  return (a + b).toUpperCase() || 'SY'
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ log }: { log: ActivityLog }) {
  const cfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.updated
  return (
    <div className="relative shrink-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--ut-navy)] to-[var(--ut-sky)] text-white text-xs font-bold shadow-sm">
        {userInitials(log)}
      </div>
      <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#111827] ${cfg.dot}`} />
    </div>
  )
}

// ─── Changes diff ─────────────────────────────────────────────────────────────

function ChangesDiff({ changes }: { changes: Record<string, { avant: unknown; apres: unknown }> }) {
  const fields = Object.keys(changes)
  if (fields.length === 0) return null
  return (
    <div className="mt-2 rounded-lg border border-black/[0.06] dark:border-white/[0.07] bg-black/[0.02] dark:bg-white/[0.02] divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden text-xs">
      {fields.map((field) => {
        const { avant, apres } = changes[field]
        return (
          <div key={field} className="flex items-start gap-3 px-3 py-1.5">
            <span className="w-28 shrink-0 font-medium text-gray-500 dark:text-gray-400 truncate">{field}</span>
            <span className="line-through text-red-500 dark:text-red-400 truncate max-w-[120px]">
              {avant != null ? String(avant) : <em className="not-italic opacity-40">vide</em>}
            </span>
            <span className="text-gray-400">→</span>
            <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[120px]">
              {apres != null ? String(apres) : <em className="not-italic opacity-40">vide</em>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Timeline item ────────────────────────────────────────────────────────────

function TimelineItem({ log, isLast }: { log: ActivityLog; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.updated
  const Icon = cfg.icon
  const hasChanges = log.changes && Object.keys(log.changes).length > 0
  const modelLabel = log.model_type ? (MODEL_LABELS[log.model_type] ?? log.model_type) : null

  return (
    <div className="relative flex gap-4">
      {/* Vertical line */}
      {!isLast && (
        <span className="absolute left-[17px] top-10 bottom-0 w-px bg-black/[0.06] dark:bg-white/[0.07]" />
      )}

      <Avatar log={log} />

      <div className="flex-1 min-w-0 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{userName(log)}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.badge}`}>
                <Icon size={10} />
                {cfg.label}
              </span>
              {modelLabel && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400">
                  {modelLabel}
                </span>
              )}
            </div>
            {/* Description */}
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {log.description}
            </p>
            {/* IP */}
            {log.ip_address && (
              <span className="text-[11px] text-gray-400 dark:text-gray-600">{log.ip_address}</span>
            )}
            {/* Changes toggle */}
            {hasChanges && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="mt-1.5 flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
              >
                <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                {expanded ? 'Masquer les modifications' : `Voir les modifications (${Object.keys(log.changes!).length} champ${Object.keys(log.changes!).length > 1 ? 's' : ''})`}
              </button>
            )}
            {expanded && hasChanges && <ChangesDiff changes={log.changes!} />}
          </div>

          {/* Timestamp */}
          <time
            title={fullDate(log.created_at)}
            className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap pt-0.5"
          >
            {relativeTime(log.created_at)}
          </time>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivitesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const dSearch = useDebouncedValue(search, 350)

  const params = {
    page,
    per_page: 10,
    ...(dSearch && { search: dSearch }),
    ...(action && { action }),
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo && { date_to: dateTo }),
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['activity-logs', params],
    queryFn: () => api.get('/activity-logs', { params }).then(r => r.data),
    placeholderData: keepPreviousData,
  })

  const paged = normalizePaged(data)
  const logs: ActivityLog[] = (paged.items as ActivityLog[]) ?? []

  const totalByAction = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.action] = (acc[l.action] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50 tracking-tight flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Activity size={18} />
            </span>
            Journal d'activité
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-11.5">
            Toutes les actions effectuées dans le système
          </p>
        </div>
        {isFetching && !isLoading && (
          <Loader2 size={16} className="animate-spin text-gray-400 mt-1.5" />
        )}
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ACTIONS.map((act) => {
          const cfg = ACTION_CONFIG[act]
          const Icon = cfg.icon
          const count = totalByAction[act] ?? 0
          const active = action === act
          return (
            <button
              key={act}
              onClick={() => { setAction(active ? '' : act); setPage(1) }}
              className={[
                'flex items-center gap-2.5 rounded-xl border px-3 py-1.5 text-left transition-all',
                active
                  ? `${cfg.badge} shadow-sm`
                  : 'bg-white dark:bg-[#1c2535] border-black/[0.07] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20',
              ].join(' ')}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-white/30' : 'bg-black/[0.04] dark:bg-white/[0.05]'}`}>
                <Icon size={14} className={active ? '' : 'text-gray-500 dark:text-gray-400'} />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{cfg.label}</div>
                <div className="text-lg font-bold leading-tight">{count}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher une action, un utilisateur…"
            className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.09] bg-white dark:bg-[#1c2535] pl-9 pr-3 py-1.5 text-sm placeholder:text-gray-400 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-400/20"
          />
        </div>
        <div className="flex items-end gap-2">
          <DatePickerInput label="Du" value={dateFrom} onChange={v => { setDateFrom(v); setPage(1) }} />
          <DatePickerInput label="Au" value={dateTo} onChange={v => { setDateTo(v); setPage(1) }} />
        </div>
        {(search || action || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(''); setAction(''); setDateFrom(''); setDateTo(''); setPage(1) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.09] text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:border-black/20 dark:hover:border-white/20 transition-colors"
          >
            <Filter size={13} />
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── Timeline ── */}
      <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#1c2535] shadow-sm">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-black/[0.06] dark:bg-white/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 min-w-0 space-y-2 pt-1">
                  <div className="h-3 w-3/5 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
                  <div className="h-2.5 w-2/5 rounded bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
                </div>
                <div className="h-2 w-16 rounded bg-black/[0.04] dark:bg-white/[0.04] animate-pulse shrink-0 mt-2" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/[0.05] mb-3">
              <Activity size={22} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aucune activité trouvée</p>
            <p className="text-xs text-gray-400 mt-0.5">Ajustez vos filtres ou revenez plus tard</p>
          </div>
        ) : (
          <div className="p-4">
            {logs.map((log, i) => (
              <TimelineItem key={log.id} log={log} isLast={i === logs.length - 1} />
            ))}
          </div>
        )}
      </div>

      {paged.lastPage > 1 && (
        <Pagination
          page={paged.page}
          lastPage={paged.lastPage}
          total={paged.total}
          perPage={10}
          onPage={setPage}
        />
      )}
    </div>
  )
}
