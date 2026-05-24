// src/features/factures/FacturesPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { DatePickerInput } from '../../ui/DatePickerInput'
import { api } from '../../lib/axios'
import { useDebouncedValue, normalizePaged, money, cx } from '../../lib/helpers'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { Pagination } from '../../ui/Pagination'
import { useToast } from '../../ui/Toasts'
import { Badge } from '../../ui/Badge'
import { ActionsMenu } from '../../ui/ActionsMenu'
import {
  Receipt, Search, Plus, Eye, Trash2, FileText, CreditCard,
  X, TrendingUp, ArrowLeft,
  AlertCircle, CheckCircle2, Clock, Loader2,
  MessageCircle,
} from 'lucide-react'
import { FacturesForm, type FactureInput } from './FacturesForm'
import { AddPaymentForm, type AddPaymentInput } from './AddPaymentForm'
import WhatsAppSendModal from '../../ui/WhatsAppSendModal'

// ─── Types ───────────────────────────────────────────────────────────────────

type Paiement = {
  id: number
  montant?: number | null
  mode_paiement?: string | null
  reference?: string | null
  statut?: string | null
  date_paiement?: string | null
  created_at?: string | null
}

type ReservationLite = {
  id: number
  reference?: string | null
  type?: string | null
  type_label?: string | null
  statut?: string | null
  client?: { id: number; prenom?: string | null; nom?: string | null; email?: string | null; telephone?: string | null; adresse?: string | null } | null
}

type Facture = {
  id: number
  numero?: string | null
  statut?: string | null
  date_facture?: string | null
  due_date?: string | null
  devise?: string | null
  total?: number | null
  montant_total?: number | null
  created_at?: string | null
  reservation_id?: number | null
  reservation?: ReservationLite | null
  paiements?: Paiement[] | { data?: Paiement[]; items?: Paiement[] } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(prenom?: string | null, nom?: string | null, email?: string | null) {
  const a = (prenom ?? '').trim()[0] ?? ''
  const b = (nom ?? '').trim()[0] ?? ''
  if (a || b) return (a + b).toUpperCase()
  return (email ?? '?').slice(0, 2).toUpperCase()
}

const STATUT_CONFIG: Record<string, { label: string; accent: string; dot: string; badge: string }> = {
  emis:              { label: 'Émise',     accent: 'border-l-sky-400',    dot: 'bg-sky-400',    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
  emise:             { label: 'Émise',     accent: 'border-l-sky-400',    dot: 'bg-sky-400',    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
  impayee:           { label: 'Impayée',   accent: 'border-l-red-400',    dot: 'bg-red-400',    badge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' },
  impayée:           { label: 'Impayée',   accent: 'border-l-red-400',    dot: 'bg-red-400',    badge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' },
  partielle:         { label: 'Partielle', accent: 'border-l-amber-400',  dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  paye_partiellement:{ label: 'Partielle', accent: 'border-l-amber-400',  dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  payee:             { label: 'Payée',     accent: 'border-l-emerald-400',dot: 'bg-emerald-400',badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  payée:             { label: 'Payée',     accent: 'border-l-emerald-400',dot: 'bg-emerald-400',badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  paye_totalement:   { label: 'Payée',     accent: 'border-l-emerald-400',dot: 'bg-emerald-400',badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  annule:            { label: 'Annulée',   accent: 'border-l-gray-300',   dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400' },
  annulee:           { label: 'Annulée',   accent: 'border-l-gray-300',   dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400' },
}

function getStatut(s?: string | null) {
  const key = String(s ?? '').toLowerCase()
  return STATUT_CONFIG[key] ?? { label: statutLabel(s), accent: 'border-l-gray-200', dot: 'bg-gray-300', badge: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400' }
}

function statutLabel(s?: string | null) {
  const x = String(s || '').toLowerCase()
  if (x === 'emis' || x === 'emise') return 'Émise'
  if (x === 'payee' || x === 'payée' || x === 'paye_totalement') return 'Payée'
  if (x === 'impayee' || x === 'impayée') return 'Impayée'
  if (x === 'partielle' || x === 'paye_partiellement') return 'Partielle'
  if (x === 'annule' || x === 'annulee' || x === 'annulée') return 'Annulée'
  // Fallback: humanize snake_case generic
  if (!s) return '—'
  return String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function paymentSummary(f: Facture) {
  const total = Number(f?.total ?? f?.montant_total ?? 0) || 0
  const raw = f?.paiements
  const arr: Paiement[] = Array.isArray(raw) ? raw
    : Array.isArray((raw as any)?.data) ? ((raw as any).data as Paiement[])
    : Array.isArray((raw as any)?.items) ? ((raw as any).items as Paiement[])
    : []
  const paid = arr.reduce((sum, p) => {
    const st = String(p?.statut ?? '').toLowerCase()
    const m = Number(p?.montant ?? 0) || 0
    if (!p?.statut) return sum + m
    if (st === 'recu' || st === 'recu') return sum + m
    return sum
  }, 0)
  const remaining = Math.max(0, total - paid)
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((paid / total) * 100))) : 0
  const tone: 'gray' | 'amber' | 'green' = paid <= 0 ? 'gray' : total > 0 && paid + 0.00001 >= total ? 'green' : 'amber'
  return { total, paid, remaining, pct, tone, paiements: arr }
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-black/[0.04] dark:border-white/[0.05]">
      <div className="h-10 w-10 rounded-xl bg-black/[0.06] dark:bg-white/[0.06] animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 rounded-lg bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
        <div className="h-2.5 w-24 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
      </div>
      <div className="hidden md:block space-y-2">
        <div className="h-3.5 w-20 rounded-lg bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
      </div>
      <div className="h-5 w-16 rounded-full bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
      <div className="h-7 w-7 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiMini({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className={cx('flex items-center justify-between gap-3 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] px-3 py-2 shadow-sm')}>
      <div className="flex items-center gap-2 min-w-0">
        <div className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', color)}>
          {icon}
        </div>
        <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide truncate">
          {label}
        </div>
      </div>
      <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate tabular-nums">
        {value}
      </div>
    </div>
  )
}

// ─── Statut pill filters ──────────────────────────────────────────────────────

const STATUT_PILLS = [
  { value: '', label: 'Toutes' },
  { value: 'emis',     label: 'Emises',    color: 'data-[active=true]:bg-sky-500 data-[active=true]:text-white data-[active=true]:border-sky-500' },
  { value: 'impayee',  label: 'Impayees',  color: 'data-[active=true]:bg-red-500 data-[active=true]:text-white data-[active=true]:border-red-500' },
  { value: 'partielle',label: 'Partielles',color: 'data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500' },
  { value: 'payee',    label: 'Payees',    color: 'data-[active=true]:bg-emerald-500 data-[active=true]:text-white data-[active=true]:border-emerald-500' },
  { value: 'annule',   label: 'Annulees',  color: 'data-[active=true]:bg-gray-500 data-[active=true]:text-white data-[active=true]:border-gray-500' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FacturesPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [sp] = useSearchParams()

  const [page, setPage] = useState(1)
  const perPage = 10

  // URL context filters (read-only, set by navigation from other pages)
  const urlClientId = sp.get('client_id') ? Number(sp.get('client_id')) : null
  const urlReservationId = sp.get('reservation_id') ? Number(sp.get('reservation_id')) : null
  const urlClientLabel = sp.get('client_label') ?? null
  const urlReservationRef = sp.get('ref') ?? null

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [fStatut, setFStatut] = useState<string>(sp.get('statut') ?? '')
  const [follow, setFollow] = useState<boolean>(sp.get('follow') === '1')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const [openCreate, setOpenCreate] = useState(false)
  const [openDetails, setOpenDetails] = useState(false)
  const [viewingId, setViewingId] = useState<number | null>(null)
  const [openAddPayment, setOpenAddPayment] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | undefined>(undefined)
  const [forceDeleteInfo, setForceDeleteInfo] = useState<{ id: number; count: number; total: number } | null>(null)

  // WhatsApp send modal (relance facture)
  const [waTarget, setWaTarget] = useState<any | null>(null)

  // ── Queries ──
  const qList = useQuery({
    queryKey: ['factures', { page, perPage, search: debouncedSearch, statut: fStatut, follow, dateFrom, dateTo, urlClientId, urlReservationId }] as const,
    queryFn: async () => {
      const { data } = await api.get('/factures', {
        params: {
          page, per_page: perPage,
          search: debouncedSearch || undefined,
          statut: fStatut || undefined,
          follow: follow ? 1 : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          client_id: urlClientId || undefined,
          reservation_id: urlReservationId || undefined,
        },
      })
      return data
    },
    placeholderData: keepPreviousData,
  })

  const paged = useMemo(() => normalizePaged(qList.data), [qList.data])
  const rows = useMemo(() => paged.items as Facture[], [paged.items])
  const total = Number(paged.total || 0)

  const qDetails = useQuery({
    queryKey: ['factures', 'details', viewingId],
    queryFn: async () => {
      if (!viewingId) return null
      const { data } = await api.get(`/factures/${viewingId}`)
      return (data?.data ?? data) as Facture
    },
    enabled: !!viewingId && openDetails,
    staleTime: 10_000,
  })

  const facture = qDetails.data ?? null
  const devise = String(facture?.devise || 'XOF')
  const pay = useMemo(() => (facture ? paymentSummary(facture) : null), [facture])
  const paiements = pay?.paiements ?? []
  const reservationId = Number(facture?.reservation_id || facture?.reservation?.id || 0) || null

  // KPIs from current page
  const kpis = useMemo(() => {
    const total_amount = rows.reduce((s, f) => s + Number(f.total ?? f.montant_total ?? 0), 0)
    const impayees = rows.filter((f) => ['impayee', 'emis'].includes(String(f.statut ?? '').toLowerCase())).length
    const payees = rows.filter((f) => String(f.statut ?? '').toLowerCase() === 'payee').length
    return { total_amount, impayees, payees }
  }, [rows])

  // ── Mutations ──
  const mCreateStandalone = useMutation({
    mutationFn: async (vals: FactureInput) => { const { data } = await api.post('/factures', vals); return data },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['factures'] }); setOpenCreate(false); toast.push({ title: 'Facture creee', tone: 'success' }) },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur creation facture', tone: 'error' }),
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/factures/${id}`),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['factures'] }); toast.push({ title: 'Facture supprimee', tone: 'success' }) },
    onError: (e: any) => {
      const body = e?.response?.data
      if (e?.response?.status === 422 && body?.has_paid) {
        setForceDeleteInfo({ id: confirmDeleteId!, count: body.paiements_count ?? 1, total: body.paiements_total ?? 0 })
      } else {
        toast.push({ title: body?.message || 'Erreur suppression', tone: 'error' })
      }
    },
  })

  const mForceDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/factures/${id}`, { params: { force: 1 } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['factures'] }); setForceDeleteInfo(null); toast.push({ title: 'Facture et paiements supprimes', tone: 'success' }) },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur suppression forcee', tone: 'error' }),
  })

  const mAddPayment = useMutation({
    mutationFn: async (vals: AddPaymentInput & { factureId: number }) => {
      const { factureId, ...payload } = vals
      const { data } = await api.post(`/factures/${factureId}/paiements`, payload)
      return data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['factures'] })
      await qc.invalidateQueries({ queryKey: ['factures', 'details', viewingId] })
      toast.push({ title: 'Paiement enregistre', tone: 'success' })
      setOpenAddPayment(false)
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur paiement', tone: 'error' }),
  })

  const mCreateFromReservation = useMutation({
    mutationFn: async ({ reservationId }: { reservationId: number }) => {
      const date_facture = new Date().toISOString().slice(0, 10)
      const { data } = await api.post(`/reservations/${reservationId}/factures`, { date_facture })
      return data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['factures'] })
      await qc.invalidateQueries({ queryKey: ['factures', 'details', viewingId] })
      toast.push({ title: 'Facture assuree', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || "Impossible d'assurer la facture", tone: 'error' }),
  })

  const downloadPdf = async (factureId: number, numero?: string | null) => {
    try {
      const filename = `${numero || `facture-${factureId}`}.pdf`.replace(/[^\w\-.]+/g, '_')
      const res = await api.get(`/factures/${factureId}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = filename
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
      toast.push({ title: 'PDF telecharge', tone: 'success' })
    } catch (e: any) {
      toast.push({ title: e?.response?.data?.message || 'PDF indisponible', tone: 'error' })
    }
  }

  const openDetailsById = (id: number) => { setViewingId(id); setOpenDetails(true); setOpenAddPayment(false) }

  const clearFilters = () => { setSearch(''); setFStatut(''); setFollow(false); setDateFrom(''); setDateTo(''); setPage(1) }

  const hasFilters = search || fStatut || follow || dateFrom || dateTo

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <Receipt size={16} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">Factures</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
              {total} facture{total > 1 ? 's' : ''} {follow ? '— vue : a suivre' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasFilters && (
            <button type="button" onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors whitespace-nowrap">
              <X size={14} /> Filtres
            </button>
          )}
          <button type="button" onClick={() => setOpenCreate(true)}
            className="inline-flex whitespace-nowrap items-center gap-2 rounded-xl bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition shadow-sm">
            <Plus size={15} /> Nouvelle facture
          </button>
        </div>
      </div>

      {/* Bandeau contextuel URL filtre */}
      {(urlClientId || urlReservationId) && (
        <div className="flex items-center gap-3 rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText size={15} className="text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="text-sm text-sky-800 dark:text-sky-200 font-medium">
              {urlReservationId
                ? <>Factures de la réservation {urlReservationRef ? <span className="font-mono font-bold">#{urlReservationRef}</span> : `#${urlReservationId}`}</>
                : <>Factures du client {urlClientLabel ? <span className="font-semibold">{urlClientLabel}</span> : `#${urlClientId}`}</>
              }
            </span>
          </div>
          <Link
            to="/factures"
            className="inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium shrink-0"
          >
            <ArrowLeft size={13} /> Toutes les factures
          </Link>
        </div>
      )}

      {/* ── KPI mini row ── */}
      {!qList.isLoading && rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiMini
            label="Total affiché"
            value={`${Number(kpis.total_amount).toLocaleString('fr-FR')} XOF`}
            icon={<TrendingUp size={16} className="text-sky-600 dark:text-sky-400" />}
            color="bg-sky-100 dark:bg-sky-500/15"
          />
          <KpiMini
            label="Impayees / Emises"
            value={`${kpis.impayees} facture${kpis.impayees > 1 ? 's' : ''}`}
            icon={<AlertCircle size={16} className="text-red-500 dark:text-red-400" />}
            color="bg-red-100 dark:bg-red-500/15"
          />
          <KpiMini
            label="Payees"
            value={`${kpis.payees} facture${kpis.payees > 1 ? 's' : ''}`}
            icon={<CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />}
            color="bg-emerald-100 dark:bg-emerald-500/15"
          />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] p-3 space-y-2.5 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] pl-8 pr-9 py-1.5 text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-400/20 transition-all"
            placeholder="Rechercher par numero, reservation..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          {search ? (
            <button onClick={() => { setSearch(''); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={14} />
            </button>
          ) : qList.isFetching && !qList.isLoading ? (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400 pointer-events-none" />
          ) : null}
        </div>

        {/* Statut pills + Date range on one row */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUT_PILLS.map((pill) => (
            <button
              key={pill.value}
              type="button"
              data-active={fStatut === pill.value ? 'true' : 'false'}
              onClick={() => { setFStatut(pill.value); setPage(1) }}
              className={cx(
                'px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap',
                'border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400',
                'hover:border-black/20 dark:hover:border-white/20',
                fStatut === pill.value
                  ? 'bg-sky-500 text-white border-sky-500 dark:border-sky-500'
                  : 'bg-transparent',
                pill.value === 'emis'      && fStatut === 'emis'      ? '!bg-sky-500 !border-sky-500 !text-white' : '',
                pill.value === 'impayee'   && fStatut === 'impayee'   ? '!bg-red-500 !border-red-500 !text-white' : '',
                pill.value === 'partielle' && fStatut === 'partielle' ? '!bg-amber-500 !border-amber-500 !text-white' : '',
                pill.value === 'payee'     && fStatut === 'payee'     ? '!bg-emerald-500 !border-emerald-500 !text-white' : '',
                pill.value === 'annule'    && fStatut === 'annule'    ? '!bg-gray-500 !border-gray-500 !text-white' : '',
                pill.value === ''          && fStatut === ''          ? '!bg-gray-900 !border-gray-900 !text-white dark:!bg-white dark:!border-white dark:!text-gray-900' : '',
              )}
            >
              {pill.label}
            </button>
          ))}
          {follow && (
            <button
              type="button"
              onClick={() => setFollow(false)}
              className="inline-flex whitespace-nowrap items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-400 bg-amber-500 text-white text-xs font-semibold"
            >
              A suivre <X size={11} />
            </button>
          )}

          {/* Date range inline */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden md:inline">Du</span>
            <DatePickerInput
              label=""
              value={dateFrom}
              onChange={(v) => { setDateFrom(v); setPage(1) }}
              placeholder="—"
            />
            <span className="text-xs text-gray-400">→</span>
            <DatePickerInput
              label=""
              value={dateTo}
              onChange={(v) => { setDateTo(v); setPage(1) }}
              placeholder="—"
            />
          </div>
        </div>
      </div>

      {/* ── Liste ── */}
      <div className="rounded-2xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">

        {/* List header */}
        <div className="hidden sm:grid grid-cols-[2.2fr_1fr_1.4fr_0.9fr_auto] items-center gap-3 px-4 py-2 border-b border-black/[0.04] dark:border-white/[0.05] bg-gray-50/80 dark:bg-white/[0.02] border-l-[3px] border-l-transparent">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">Client · Facture</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Date</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Montant</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Statut</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Actions</span>
        </div>

        {qList.isLoading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : qList.isError ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-5">
            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-3">
              <AlertCircle size={20} className="text-red-400" />
            </div>
            <div className="text-sm font-semibold text-gray-500">Impossible de charger les factures</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
              <Receipt size={22} className="text-gray-300 dark:text-gray-600" />
            </div>
            <div className="text-base font-semibold text-gray-500 dark:text-gray-400">Aucune facture trouvee</div>
            <div className="text-sm text-gray-400 dark:text-gray-600 mt-1 mb-4">
              {hasFilters ? 'Essayez de modifier vos filtres' : 'Commencez par creer une facture'}
            </div>
            {hasFilters ? (
              <button onClick={clearFilters} className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <X size={14} /> Effacer les filtres
              </button>
            ) : (
              <button onClick={() => setOpenCreate(true)} className="inline-flex whitespace-nowrap items-center gap-2 rounded-xl bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition">
                <Plus size={15} /> Nouvelle facture
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {rows.map((f) => {
              const p = paymentSummary(f)
              const st = getStatut(f.statut)
              const client = f.reservation?.client
              const clientName = [client?.prenom, client?.nom].filter(Boolean).join(' ') || client?.email || null
              const ini = initials(client?.prenom, client?.nom, client?.email)
              const montant = Number(f.total ?? f.montant_total ?? 0)

              const isUnpaid = ['impayee', 'impayée', 'emis', 'emise', 'partielle', 'paye_partiellement'].includes(String(f.statut || '').toLowerCase())
              const hasPhone = !!client?.telephone

              const actions = [
                { label: 'Voir', icon: <Eye size={15} />, onClick: () => openDetailsById(Number(f.id)) },
                { label: 'Telecharger PDF', icon: <FileText size={15} />, onClick: () => downloadPdf(Number(f.id), f.numero) },
                ...(isUnpaid && hasPhone
                  ? [{
                      label: 'Relance WhatsApp',
                      icon: <MessageCircle size={15} />,
                      onClick: () => setWaTarget(f),
                    }]
                  : []),
                { label: 'Supprimer', icon: <Trash2 size={15} />, tone: 'danger' as const, onClick: () => { setConfirmDeleteId(Number(f.id)); setConfirmDeleteName(f.numero ?? `#${f.id}`) }, disabled: mDelete.isPending },
              ]

              return (
                <div
                  key={f.id}
                  className={cx(
                    'group grid grid-cols-1 sm:grid-cols-[2.2fr_1fr_1.4fr_0.9fr_auto] items-center gap-3 px-4 py-2',
                    'hover:bg-gray-50/80 dark:hover:bg-white/[0.025] transition-colors cursor-pointer',
                    'border-l-[3px]', st.accent,
                  )}
                  onClick={() => openDetailsById(Number(f.id))}
                >
                  {/* Cell 1 : avatar + client · numéro (1 line) */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-sky-100 dark:bg-sky-500/15 flex items-center justify-center text-[10px] font-bold text-sky-700 dark:text-sky-300">
                      {ini}
                    </div>
                    <div className="min-w-0 flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {clientName || (f.reservation?.reference ? `Res. ${f.reservation.reference}` : `Facture #${f.id}`)}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate hidden md:inline shrink-0">
                        · {f.numero || `#${f.id}`}
                      </span>
                    </div>
                  </div>

                  {/* Cell 2 : Date (1 line) */}
                  <div className="hidden sm:block text-sm text-gray-600 dark:text-gray-300 tabular-nums truncate text-center" title={f.due_date ? `Échéance: ${safeDate(f.due_date)}` : undefined}>
                    {safeDate(f.date_facture || f.created_at)}
                  </div>

                  {/* Cell 3 : Montant + mini progress inline */}
                  <div className="hidden sm:flex items-center justify-center gap-2 min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
                      {montant.toLocaleString('fr-FR')}<span className="text-[10px] font-normal text-gray-400 ml-1">XOF</span>
                    </div>
                    <div className="h-1 w-10 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden shrink-0">
                      <div
                        className={cx('h-full rounded-full', p.pct >= 100 ? 'bg-emerald-500' : p.pct > 0 ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600')}
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 tabular-nums shrink-0">{p.pct}%</span>
                  </div>

                  {/* Cell 4 : Statut */}
                  <div className="hidden sm:flex items-center justify-center">
                    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap', st.badge)}>
                      <span className={cx('h-1 w-1 rounded-full shrink-0', st.dot)} />
                      {statutLabel(f.statut)}
                    </span>
                  </div>

                  {/* Mobile summary */}
                  <div className="flex sm:hidden flex-wrap items-center gap-2 mt-1">
                    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', st.badge)}>
                      <span className={cx('h-1.5 w-1.5 rounded-full', st.dot)} />
                      {statutLabel(f.statut)}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {montant.toLocaleString('fr-FR')} XOF
                    </span>
                  </div>

                  {/* Cell 5 : Actions */}
                  <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
                    <ActionsMenu items={actions} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Pagination page={paged.page} lastPage={paged.lastPage} total={paged.total} perPage={perPage} onPage={setPage} />

      {/* ── Modal Nouvelle facture ── */}
      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Nouvelle facture" widthClass="max-w-3xl">
        <FacturesForm
          defaultValues={undefined}
          onSubmit={(vals: FactureInput) => mCreateStandalone.mutate(vals)}
          onCancel={() => setOpenCreate(false)}
          submitting={mCreateStandalone.isPending}
        />
      </Modal>

      {/* ── Modal Details ── */}
      <Modal
        open={openDetails}
        onClose={() => { setOpenDetails(false); setViewingId(null); setOpenAddPayment(false) }}
        title="Details de la facture"
        widthClass="max-w-4xl"
      >
        <div className="max-h-[80vh] overflow-y-auto ut-scrollbar pr-1">
          {!viewingId ? (
            <div className="py-5 text-center text-sm text-gray-500">ID manquant.</div>
          ) : qDetails.isLoading ? (
            <div className="space-y-3 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl animate-pulse bg-black/[0.04] dark:bg-white/[0.04]" />
              ))}
            </div>
          ) : qDetails.isError ? (
            <div className="py-5 text-center text-sm text-red-500">Impossible de charger les details.</div>
          ) : !facture ? (
            <div className="py-5 text-center text-sm text-gray-500">Aucune donnee.</div>
          ) : (
            <div className="space-y-3 p-1">
              {/* Hero summary */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1929] via-[#111827] to-[#0c1320] p-4">
                <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Receipt size={14} className="text-sky-400" />
                      <span className="text-xs font-semibold text-sky-400 uppercase tracking-widest">Facture</span>
                    </div>
                    <div className="text-xl font-extrabold text-white">{facture.numero || `#${facture.id}`}</div>
                    <div className="text-xs text-gray-400 mt-1">{safeDate(facture.date_facture || facture.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-white">{Number(pay?.total ?? 0).toLocaleString('fr-FR')} XOF</div>
                    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold mt-1', getStatut(facture.statut).badge)}>
                      <span className={cx('h-1.5 w-1.5 rounded-full', getStatut(facture.statut).dot)} />
                      {statutLabel(facture.statut)}
                    </span>
                  </div>
                </div>

                {/* Payment progress */}
                <div className="relative mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Paye : {Number(pay?.paid ?? 0).toLocaleString('fr-FR')} XOF</span>
                    <span>Reste : {Number(pay?.remaining ?? 0).toLocaleString('fr-FR')} XOF</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10">
                    <div
                      className={cx('h-full rounded-full transition-all duration-700', pay?.pct === 100 ? 'bg-emerald-400' : pay && pay.pct > 0 ? 'bg-amber-400' : 'bg-gray-600')}
                      style={{ width: `${pay?.pct ?? 0}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-gray-500 text-right">{pay?.pct ?? 0}% regle</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => downloadPdf(Number(facture.id), facture.numero)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                  <FileText size={14} /> Telecharger PDF
                </button>
                <button type="button" onClick={() => setOpenAddPayment((v) => !v)}
                  className={cx('inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                    openAddPayment
                      ? 'border-sky-400 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300'
                      : 'border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10'
                  )}>
                  <CreditCard size={14} /> Ajouter un paiement
                </button>
                {reservationId && (
                  <button type="button" onClick={() => mCreateFromReservation.mutate({ reservationId })} disabled={mCreateFromReservation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50">
                    <Receipt size={14} /> Assurer (reservation)
                  </button>
                )}
              </div>

              {/* Add payment form */}
              {openAddPayment && (
                <div className="rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-500/5 p-4">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Nouveau paiement</div>
                  <AddPaymentForm
                    onSubmit={(vals: AddPaymentInput) => mAddPayment.mutate({ ...vals, factureId: Number(facture.id) })}
                    onCancel={() => setOpenAddPayment(false)}
                    submitting={mAddPayment.isPending}
                    defaultValues={{}}
                  />
                </div>
              )}

              {/* Client + Reservation */}
              {facture.reservation && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] p-4">
                    <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Reservation</div>
                    <div className="space-y-2 text-sm">
                      {[
                        { label: 'Reference', value: facture.reservation.reference || `#${facture.reservation.id}` },
                        { label: 'Type', value: facture.reservation.type_label || facture.reservation.type || '—' },
                        { label: 'Statut', value: facture.reservation.statut || '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between gap-3">
                          <span className="text-gray-400 dark:text-gray-500">{label}</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-right">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] p-4">
                    <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Client</div>
                    <div className="space-y-2 text-sm">
                      {[
                        { label: 'Nom', value: [facture.reservation.client?.prenom, facture.reservation.client?.nom].filter(Boolean).join(' ') || '—' },
                        facture.reservation.client?.email ? { label: 'Email', value: facture.reservation.client.email } : null,
                        facture.reservation.client?.telephone ? { label: 'Tel', value: facture.reservation.client.telephone } : null,
                      ].filter(Boolean).map((item: any) => (
                        <div key={item.label} className="flex justify-between gap-3">
                          <span className="text-gray-400 dark:text-gray-500">{item.label}</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-right truncate max-w-[160px]">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Paiements list */}
              <div className="rounded-2xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.05]">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Historique des paiements</div>
                  <span className="text-xs text-gray-400">{paiements.length} entree{paiements.length > 1 ? 's' : ''}</span>
                </div>
                {paiements.length === 0 ? (
                  <div className="py-5 text-center text-sm text-gray-400">Aucun paiement enregistre.</div>
                ) : (
                  <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04] max-h-64 overflow-y-auto ut-scrollbar">
                    {paiements
                      .slice()
                      .sort((a: any, b: any) => +new Date(b?.date_paiement || b?.created_at || 0) - +new Date(a?.date_paiement || a?.created_at || 0))
                      .map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              <CreditCard size={13} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {p.mode_paiement ?? '—'}{p.reference ? ` (${p.reference})` : ''}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {safeDate(p.date_paiement || p.created_at)}
                                {p.statut ? ` · ${String(p.statut)}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                            +{Number(p.montant ?? 0).toLocaleString('fr-FR')} XOF
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        onCancel={() => { setConfirmDeleteId(null); setConfirmDeleteName(undefined) }}
        onConfirm={() => { if (confirmDeleteId != null) mDelete.mutate(confirmDeleteId); setConfirmDeleteId(null); setConfirmDeleteName(undefined) }}
        title="Supprimer cette facture ?"
        message="Cette action est irreversible."
        itemName={confirmDeleteName}
      />
      <ConfirmDialog
        open={forceDeleteInfo !== null}
        onCancel={() => setForceDeleteInfo(null)}
        onConfirm={() => { if (forceDeleteInfo) mForceDelete.mutate(forceDeleteInfo.id) }}
        title="Supprimer malgre les paiements encaisses ?"
        message={forceDeleteInfo
          ? `Cette facture contient ${forceDeleteInfo.count} paiement(s) pour ${Number(forceDeleteInfo.total).toLocaleString()} XOF. Tout sera supprime.`
          : ''}
      />

      {/* ── WhatsApp relance facture ── */}
      {waTarget && (() => {
        const f = waTarget
        const client = f.reservation?.client
        const total = Number(f.total ?? f.montant_total ?? 0)
        const paid = Array.isArray(f.paiements)
          ? f.paiements.filter((p: any) => String(p?.statut || '').toLowerCase() === 'recu')
              .reduce((s: number, p: any) => s + Number(p?.montant || 0), 0)
          : 0
        const remaining = Math.max(0, total - paid)
        return (
          <WhatsAppSendModal
            open={true}
            onClose={() => setWaTarget(null)}
            defaultTemplate="invoiceReminder"
            allowedTemplates={['invoiceReminder', 'paymentReceived', 'custom']}
            context={{
              client: {
                prenom: client?.prenom ?? null,
                nom: client?.nom ?? null,
                telephone: client?.telephone ?? null,
              },
              facture: {
                numero: f.numero ?? f.reference ?? null,
                reference: f.reference ?? null,
                montant_total: total,
                devise: f.devise || 'XOF',
                remaining,
                date_echeance: f.date_echeance ?? null,
              },
              agencyName: 'Universal Tours',
            }}
          />
        )
      })()}
    </div>
  )
}
