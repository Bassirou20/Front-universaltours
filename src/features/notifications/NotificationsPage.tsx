// src/features/notifications/NotificationsPage.tsx
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { Pagination } from '../../ui/Pagination'
import { useToast } from '../../ui/Toasts'
import {
  Bell, CheckCheck, Calendar, CreditCard, FileText, Receipt,
  ShieldCheck, BarChart3, AlertCircle, Trash2, Search,
  Loader2, RefreshCw,
} from 'lucide-react'
import type { AppNotification } from '../../hooks/useNotifications'

// ─── Mapping type → icône / libellé ──────────────────────────────────────────
const TYPE_META: Record<string, { label: string; icon: React.ReactNode; tone: string }> = {
  reservation_created:   { label: 'Nouvelle réservation',  icon: <Calendar size={14} />,    tone: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10' },
  reservation_confirmed: { label: 'Réservation confirmée', icon: <Calendar size={14} />,    tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' },
  reservation_cancelled: { label: 'Réservation annulée',   icon: <Calendar size={14} />,    tone: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10' },
  payment_received:      { label: 'Paiement reçu',         icon: <CreditCard size={14} />,  tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' },
  invoice_paid:          { label: 'Facture payée',         icon: <Receipt size={14} />,     tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' },
  invoice_overdue:       { label: 'Facture échue',         icon: <AlertCircle size={14} />, tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' },
  user_created:          { label: 'Nouvel utilisateur',    icon: <ShieldCheck size={14} />, tone: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' },
  daily_summary:         { label: 'Récap du jour',         icon: <BarChart3 size={14} />,   tone: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/10' },
}

const DEFAULT_TYPE = { label: 'Notification', icon: <FileText size={14} />, tone: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/10' }

function metaFor(type: string) {
  return TYPE_META[type] ?? DEFAULT_TYPE
}

// ─── Horodatage relatif ──────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diffSec = Math.floor((Date.now() - t) / 1000)
  if (diffSec < 60) return "à l'instant"
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)} min`
  if (diffSec < 86400) return `il y a ${Math.floor(diffSec / 3600)} h`
  if (diffSec < 604800) return `il y a ${Math.floor(diffSec / 86400)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function dateLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Filtres ──────────────────────────────────────────────────────────────────
const READ_FILTERS = [
  { value: 'all',    label: 'Toutes' },
  { value: 'unread', label: 'Non lues' },
  { value: 'read',   label: 'Lues' },
] as const

const TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: '',                       label: 'Tous types' },
  { value: 'reservation_created',    label: 'Nouvelle réservation' },
  { value: 'reservation_confirmed',  label: 'Réservation confirmée' },
  { value: 'reservation_cancelled',  label: 'Réservation annulée' },
  { value: 'payment_received',       label: 'Paiement reçu' },
  { value: 'invoice_paid',           label: 'Facture payée' },
  { value: 'invoice_overdue',        label: 'Facture échue' },
  { value: 'user_created',           label: 'Nouvel utilisateur' },
  { value: 'daily_summary',          label: 'Récap du jour' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const perPage = 20
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  const q = useQuery({
    queryKey: ['notifications', 'page', { page, perPage, readFilter, typeFilter }] as const,
    queryFn: async () => {
      const { data } = await api.get('/notifications', {
        params: {
          page,
          per_page: perPage,
          unread_only: readFilter === 'unread' ? 1 : undefined,
        },
      })
      return data
    },
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  })

  // Filtrage client-side pour type + read + search (pour rester léger côté API V1)
  const allItems: AppNotification[] = useMemo(() => (Array.isArray(q.data?.data) ? q.data.data : []), [q.data])

  const filtered = useMemo(() => {
    let rows = allItems
    if (readFilter === 'read') rows = rows.filter((n) => !!n.read_at)
    if (typeFilter) rows = rows.filter((n) => n.type === typeFilter)
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      rows = rows.filter((n) =>
        (n.title || '').toLowerCase().includes(s) ||
        (n.body || '').toLowerCase().includes(s)
      )
    }
    return rows
  }, [allItems, readFilter, typeFilter, search])

  const totalAll = Number(q.data?.total ?? 0)
  const lastPage = Number(q.data?.last_page ?? 1)
  const unreadCount = useMemo(() => allItems.filter((n) => !n.read_at).length, [allItems])

  // ── Mutations
  const mMarkRead = useMutation({
    mutationFn: async (id: number) => { await api.post(`/notifications/${id}/read`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const mMarkAllRead = useMutation({
    mutationFn: async () => { await api.post('/notifications/mark-all-read') },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.push({ title: 'Toutes les notifications sont marquées comme lues', tone: 'success' })
    },
  })

  const mDelete = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/notifications/${id}`) },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.push({ title: 'Notification supprimée', tone: 'success' })
    },
  })

  const handleRowClick = (n: AppNotification) => {
    if (!n.read_at) mMarkRead.mutate(n.id)
    if (n.url) navigate(n.url)
  }

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bell size={20} className="text-[var(--ut-orange)]" />
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Historique de toutes les notifications de votre compte.
            {totalAll > 0 && (
              <span> · <strong>{totalAll}</strong> au total{unreadCount > 0 ? ` · ${unreadCount} non-lue${unreadCount > 1 ? 's' : ''}` : ''}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => q.refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition"
            disabled={q.isFetching}
          >
            <RefreshCw size={13} className={q.isFetching ? 'animate-spin' : ''} />
            Actualiser
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => mMarkAllRead.mutate()}
              disabled={mMarkAllRead.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-100 transition disabled:opacity-40"
            >
              <CheckCheck size={13} />
              Tout marquer lu
            </button>
          )}
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Pills lu/non-lu */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/[0.06] rounded-lg">
          {READ_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => { setReadFilter(f.value); setPage(1) }}
              className={[
                'px-3 py-1 rounded-md text-xs font-medium transition',
                readFilter === f.value
                  ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Select type */}
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-panel text-sm text-gray-700 dark:text-gray-200"
        >
          {TYPE_FILTERS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-panel text-sm text-gray-700 dark:text-gray-200"
          />
        </div>
      </div>

      {/* ── Liste ── */}
      <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-panel overflow-hidden">
        {q.isLoading ? (
          <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.07]">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-black/[0.06] dark:bg-white/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
                  <div className="h-2.5 w-1/2 rounded bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
                  <div className="h-2 w-24 rounded bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Bell size={36} className="text-gray-300 dark:text-gray-600 mb-3" />
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {readFilter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {totalAll === 0
                ? "Les nouvelles notifications apparaîtront ici dès qu'un événement aura lieu."
                : 'Essayez d\'ajuster les filtres ci-dessus.'}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.07]">
            {filtered.map((n) => {
              const isUnread = !n.read_at
              const meta = metaFor(n.type)
              return (
                <li
                  key={n.id}
                  onClick={() => handleRowClick(n)}
                  className={[
                    'group flex items-start gap-3 px-4 py-3.5 transition cursor-pointer',
                    isUnread
                      ? 'bg-[var(--ut-orange)]/[0.04] hover:bg-[var(--ut-orange)]/[0.08]'
                      : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]',
                  ].join(' ')}
                >
                  {/* Icon badge */}
                  <div className={['flex items-center justify-center w-9 h-9 rounded-xl shrink-0', meta.tone].join(' ')}>
                    {meta.icon}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className={[
                          'text-sm leading-tight',
                          isUnread ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-600 dark:text-gray-300',
                        ].join(' ')}>
                          {n.title}
                        </div>
                        {n.body && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {n.body}
                          </div>
                        )}
                      </div>
                      {isUnread && (
                        <span className="shrink-0 mt-1 w-2 h-2 rounded-full bg-[var(--ut-orange)]" aria-label="Non lue" />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <span className="text-[10.5px] text-gray-400 dark:text-gray-500">
                        {timeAgo(n.created_at)} <span className="hidden sm:inline">· {dateLabel(n.created_at)}</span>
                      </span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        {isUnread && (
                          <button
                            onClick={(e) => { e.stopPropagation(); mMarkRead.mutate(n.id) }}
                            className="text-[10.5px] text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Marquer comme lue"
                          >
                            Marquer lue
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); mDelete.mutate(n.id) }}
                          className="text-gray-400 hover:text-rose-500 transition"
                          title="Supprimer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalAll > perPage && (
        <Pagination
          page={page}
          lastPage={lastPage}
          total={totalAll}
          perPage={perPage}
          onPage={setPage}
        />
      )}
    </div>
  )
}
