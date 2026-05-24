import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../../lib/axios'
import { useDebouncedValue, fetchAllPaged } from '../../lib/helpers'
import Modal from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { T, Th, Td } from '../../ui/Table'
import { Pagination } from '../../ui/Pagination'
import { FiltersBar } from '../../ui/FiltersBar'
import { useToast } from '../../ui/Toasts'
import { useAuth } from '../../store/auth'
import { ActionsMenu } from '../../ui/ActionsMenu'
import { SkeletonTable } from '../../ui/Skeleton'
import PaiementsForm, { type PaiementInput, type FactureOption } from './PaiementsForm'
import PaiementDetails, { type PaiementModel } from './PaiementDetails'
import {
  Eye, Pencil, Trash2, Plus, Search, Wallet, Calendar, X, Loader2,
  ArrowLeft, CreditCard, Banknote, Smartphone, Building2, FileText,
  Clock, TrendingUp, CheckCircle2, AlertCircle, ChevronRight, Download,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Facture = {
  id: number
  numero?: string | null
  statut?: string | null
  montant_total?: number | null
  total?: number | null
  created_at?: string | null
  paiements?: PaiementModel[]
}

// ─── Mode / Statut config ────────────────────────────────────────────────────

const MODE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  especes:      { label: 'Espèces',      icon: <Banknote size={13} />,   color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-500/15' },
  orange_money: { label: 'Orange Money', icon: <Smartphone size={13} />, color: 'text-orange-700 dark:text-orange-300',  bg: 'bg-orange-100 dark:bg-orange-500/15'  },
  wave:         { label: 'Wave',         icon: <Smartphone size={13} />, color: 'text-sky-700 dark:text-sky-300',        bg: 'bg-sky-100 dark:bg-sky-500/15'        },
  carte:        { label: 'Carte',        icon: <CreditCard size={13} />, color: 'text-violet-700 dark:text-violet-300',  bg: 'bg-violet-100 dark:bg-violet-500/15'  },
  virement:     { label: 'Virement',     icon: <Building2 size={13} />,  color: 'text-blue-700 dark:text-blue-300',      bg: 'bg-blue-100 dark:bg-blue-500/15'      },
  cheque:       { label: 'Chèque',       icon: <FileText size={13} />,   color: 'text-gray-700 dark:text-gray-300',      bg: 'bg-gray-100 dark:bg-white/10'         },
  free_money:   { label: 'Free Money',   icon: <Smartphone size={13} />, color: 'text-purple-700 dark:text-purple-300',  bg: 'bg-purple-100 dark:bg-purple-500/15'  },
}

const STATUT_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  recu:       { label: 'Reçu',       icon: <CheckCircle2 size={12} />, cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15' },
  reçu:       { label: 'Reçu',       icon: <CheckCircle2 size={12} />, cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15' },
  en_attente: { label: 'En attente', icon: <Clock size={12} />,        cls: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15'         },
  annule:     { label: 'Annulé',     icon: <AlertCircle size={12} />,  cls: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/10'                },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const money = (n: any) => `${Number(n || 0).toLocaleString('fr-FR')} XOF`

const fmtDate = (d: any) => {
  const s = String(d || '').slice(0, 10)
  if (!s) return '—'
  const [y, m, day] = s.split('-')
  return `${day}/${m}/${y}`
}

const startOfMonthISO = () => {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function ModeBadge({ mode }: { mode?: string | null }) {
  const cfg = MODE_CONFIG[mode ?? '']
  if (!cfg) return <span className="text-gray-400 text-xs">—</span>
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function StatutBadge({ statut }: { statut?: string | null }) {
  const key = String(statut || '').toLowerCase()
  const cfg = STATUT_CONFIG[key] ?? { label: statut || '—', icon: null, cls: 'text-gray-500 bg-gray-100 dark:bg-white/10' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiInline({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${color}`}>
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

function KpiCard({ label, value, sub, icon, accent, iconBg, to }: {
  label: string; value: React.ReactNode; sub?: string
  icon: React.ReactNode; accent: string; iconBg: string; to?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] shadow-sm">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accent}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</div>
            <div className="mt-1.5 text-xl font-bold text-gray-900 dark:text-gray-50 truncate">{value}</div>
            {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
        </div>
      </div>
      {to && (
        <Link to={to} className="flex items-center justify-between px-4 py-2 border-t border-black/5 dark:border-white/[0.06] text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all">
          <span>Voir détails</span>
          <ChevronRight size={12} />
        </Link>
      )}
    </div>
  )
}

// ─── Fetch paiements (uses dedicated endpoint with facture fallback) ──────────

async function fetchPaiementsSmart(): Promise<PaiementModel[]> {
  try {
    const res = await api.get('/paiements', { params: { per_page: 200 } })
    const data = res.data
    if (Array.isArray(data)) return data as PaiementModel[]
    if (Array.isArray(data?.data)) {
      if (data.data.length < (data.total ?? data.data.length)) {
        const all = await fetchAllPaged<PaiementModel>('/paiements')
        return all.length ? all : (data.data as PaiementModel[])
      }
      return data.data as PaiementModel[]
    }
  } catch {
    // fallback: collect paiements from factures
  }

  const factures = await fetchAllPaged<Facture>('/factures')
  const flattened: PaiementModel[] = []
  for (const f of factures) {
    for (const p of (Array.isArray(f.paiements) ? f.paiements : [])) {
      flattened.push({
        ...p,
        facture_id: (p.facture_id ?? f.id) as any,
        facture: (p as any).facture ?? {
          id:     f.id,
          numero: f.numero ?? null,
          total:  (f.total ?? f.montant_total ?? null) as any,
          statut: f.statut ?? null,
        },
      } as any)
    }
  }
  return flattened
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PaiementsPage() {
  const qc    = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = (user?.role ?? '').toLowerCase() === 'admin'
  const [sp] = useSearchParams()

  const [page, setPage] = useState(1)
  const perPage = 10

  const urlFactureId   = sp.get('facture_id') ?? ''
  const urlFactureNum  = sp.get('facture_num') ?? null
  const urlClientLabel = sp.get('client_label') ?? null

  const [search, setSearch]         = useState('')
  const debouncedSearch              = useDebouncedValue(search, 300)
  const [fMode, setFMode]           = useState<string>('')
  const [fStatut, setFStatut]       = useState<string>('')
  const [fFactureId, setFFactureId] = useState<string>(urlFactureId)
  const [dateFrom, setDateFrom]     = useState<string>(startOfMonthISO())
  const [dateTo, setDateTo]         = useState<string>('')

  const [formOpen, setFormOpen]         = useState(false)
  const [detailsOpen, setDetailsOpen]   = useState(false)
  const [editing, setEditing]           = useState<PaiementModel | null>(null)
  const [selected, setSelected]         = useState<PaiementModel | null>(null)
  const [confirmId, setConfirmId]       = useState<number | null>(null)
  const [confirmName, setConfirmName]   = useState<string | undefined>()
  const [exporting, setExporting]       = useState(false)

  const qPaiements = useQuery({
    queryKey: ['paiements-all-smart'],
    queryFn:  fetchPaiementsSmart,
    staleTime: 20_000,
  })

  const qFactures = useQuery({
    queryKey: ['factures-options'],
    queryFn: async () => {
      const factures = await fetchAllPaged<Facture>('/factures')
      return factures.map((f) => ({
        id:     f.id,
        numero: f.numero ?? null,
        total:  (f.total ?? f.montant_total ?? null) as any,
        statut: f.statut ?? null,
      })) as FactureOption[]
    },
    staleTime: 60_000,
  })

  const paiements = useMemo(() => qPaiements.data ?? [], [qPaiements.data])
  const factures  = useMemo(() => qFactures.data ?? [], [qFactures.data])

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    let totalEncaisse = 0, thisMonth = 0, enAttente = 0, nbAttente = 0

    for (const p of paiements as any[]) {
      const st  = String(p.statut || '').toLowerCase()
      const amt = Number(p.montant || 0)
      const d   = String(p.date_paiement || p.created_at || '').slice(0, 10)
      const t   = d ? new Date(`${d}T00:00:00`).getTime() : 0
      if (st === 'recu' || st === 'reçu') { totalEncaisse += amt; if (t >= monthStart) thisMonth += amt }
      if (st === 'en_attente')            { enAttente += amt; nbAttente++ }
    }
    return { totalEncaisse, thisMonth, enAttente, nbAttente }
  }, [paiements])

  // ── Répartition par mode ──────────────────────────────────────────────────

  const modeStats = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of paiements as any[]) {
      const st = String(p.statut || '').toLowerCase()
      if (st !== 'recu' && st !== 'reçu') continue
      const mode = String(p.mode_paiement || 'autre')
      map[mode] = (map[mode] || 0) + Number(p.montant || 0)
    }
    return Object.entries(map).sort(([, a], [, b]) => b - a)
  }, [paiements])

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...(paiements as any[])]
    const s  = debouncedSearch.trim().toLowerCase()

    if (s)          list = list.filter(p =>
      String(p.reference ?? '').toLowerCase().includes(s) ||
      String(p.facture?.numero ?? '').toLowerCase().includes(s) ||
      String(p.mode_paiement ?? '').toLowerCase().includes(s) ||
      String(p.id).includes(s))
    if (fMode)      list = list.filter(p => String(p.mode_paiement || '') === fMode)
    if (fStatut)    list = list.filter(p => String(p.statut || '').toLowerCase() === fStatut)
    if (fFactureId) list = list.filter(p => String(p.facture_id) === String(fFactureId))
    if (dateFrom) {
      const t = +new Date(`${dateFrom}T00:00:00`)
      list = list.filter(p => {
        const d = String(p.date_paiement || p.created_at || '').slice(0, 10)
        return d ? +new Date(`${d}T00:00:00`) >= t : false
      })
    }
    if (dateTo) {
      const t = +new Date(`${dateTo}T23:59:59`)
      list = list.filter(p => {
        const d = String(p.date_paiement || p.created_at || '').slice(0, 10)
        return d ? +new Date(`${d}T23:59:59`) <= t : false
      })
    }

    list.sort((a, b) =>
      +new Date(b.date_paiement || b.created_at || 0) - +new Date(a.date_paiement || a.created_at || 0)
    )
    return list
  }, [paiements, debouncedSearch, fMode, fStatut, fFactureId, dateFrom, dateTo])

  const total    = filtered.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  useEffect(() => { setPage(p => Math.min(Math.max(1, p), lastPage)) }, [lastPage])

  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page, perPage])

  const totalFilteredAmount = useMemo(() =>
    filtered.filter((p: any) => {
      const st = String(p.statut || '').toLowerCase()
      return st === 'recu' || st === 'reçu'
    }).reduce((s: number, p: any) => s + Number(p.montant || 0), 0),
  [filtered])

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['paiements-all-smart'] })
    await qc.invalidateQueries({ queryKey: ['factures-options'] })
  }

  const mCreate = useMutation({
    mutationFn: (vals: PaiementInput) => api.post(`/factures/${vals.facture_id}/paiements`, vals),
    onSuccess: async () => {
      await invalidate(); setFormOpen(false); setEditing(null)
      toast.push({ title: 'Paiement enregistré', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur création paiement', tone: 'error' }),
  })

  const mUpdate = useMutation({
    mutationFn: (vals: PaiementInput) => api.put(`/paiements/${editing?.id}`, vals),
    onSuccess: async () => {
      await invalidate(); setFormOpen(false); setEditing(null)
      toast.push({ title: 'Paiement mis à jour', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Modification non disponible', tone: 'error' }),
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/paiements/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['paiements-all-smart'] })
      toast.push({ title: 'Paiement supprimé', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Suppression non disponible', tone: 'error' }),
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate  = () => { setEditing(null); setFormOpen(true) }
  const openEdit    = (p: PaiementModel) => { setEditing(p); setFormOpen(true) }
  const openDetails = (p: PaiementModel) => { setSelected(p); setDetailsOpen(true) }

  const toDefaults = (p?: PaiementModel): Partial<PaiementInput> | undefined => {
    if (!p) return undefined
    return {
      facture_id:    (p as any).facture_id,
      date_paiement: String((p as any).date_paiement || (p as any).created_at || '').slice(0, 10),
      montant:       Number((p as any).montant || 0),
      mode_paiement: String((p as any).mode_paiement || 'especes'),
      reference:     (p as any).reference ?? '',
      statut:        (p as any).statut ?? 'recu',
      notes:         (p as any).notes ?? '',
    }
  }

  const clearFilters = () => {
    setSearch(''); setFMode(''); setFStatut(''); setFFactureId('')
    setDateFrom(startOfMonthISO()); setDateTo(''); setPage(1)
  }

  const hasFilters = Boolean(debouncedSearch || fMode || fStatut || fFactureId || dateTo)

  const handleExport = async () => {
    setExporting(true)
    try {
      const params: Record<string, string> = {}
      if (fMode)      params.mode_paiement = fMode
      if (fStatut)    params.statut        = fStatut
      if (fFactureId) params.facture_id    = fFactureId
      if (dateFrom)   params.date_from     = dateFrom
      if (dateTo)     params.date_to       = dateTo
      if (debouncedSearch) params.search   = debouncedSearch

      const res = await api.get('/paiements/export', { params, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a   = document.createElement('a')
      a.href    = url
      a.download = `paiements-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.push({ title: 'Export non disponible', tone: 'error' })
    } finally {
      setExporting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <CreditCard size={16} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">Paiements</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
              {total} paiement{total > 1 ? 's' : ''} affiché{total > 1 ? 's' : ''}
              {hasFilters && <span className="ml-1.5 text-amber-500 font-medium">· Filtres actifs</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors whitespace-nowrap"
            onClick={handleExport}
            disabled={exporting}
            title="Exporter en Excel"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export
          </button>
          <button
            className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition shadow-sm"
            onClick={openCreate}
          >
            <Plus size={15} /> Nouveau paiement
          </button>
        </div>
      </div>

      {/* ── Bandeau filtre URL ── */}
      {(urlFactureId || urlClientLabel) && (
        <div className="flex items-center gap-3 rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-4 py-3">
          <CreditCard size={15} className="text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="text-sm text-sky-800 dark:text-sky-200 font-medium flex-1 min-w-0">
            {urlFactureId
              ? <>Paiements de la facture {urlFactureNum ? <span className="font-mono font-bold">{urlFactureNum}</span> : `#${urlFactureId}`}</>
              : <>Paiements du client <span className="font-semibold">{urlClientLabel}</span></>
            }
          </span>
          <Link to="/paiements" className="inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium shrink-0">
            <ArrowLeft size={13} /> Tous les paiements
          </Link>
        </div>
      )}

      {/* ── KPI Cards (compact 1-line) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiInline label="Total encaissé" value={money(kpis.totalEncaisse)} icon={<TrendingUp size={14} />} color="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" />
        <KpiInline label="Ce mois" value={money(kpis.thisMonth)} icon={<Calendar size={14} />} color="bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400" />
        <KpiInline label="En attente" value={money(kpis.enAttente)} icon={<Clock size={14} />} color="bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" />
        <KpiInline label="Filtrés" value={money(totalFilteredAmount)} icon={<Wallet size={14} />} color="bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400" />
      </div>

      {/* ── Répartition par mode (chips cliquables) ── */}
      {modeStats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {modeStats.map(([mode, mTotal]) => {
            const cfg     = MODE_CONFIG[mode]
            const isActive = fMode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => { setFMode(isActive ? '' : mode); setPage(1) }}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all',
                  isActive
                    ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-black'
                    : `border-black/10 dark:border-white/10 ${cfg ? `${cfg.color} ${cfg.bg}` : 'text-gray-600 bg-gray-100 dark:bg-white/10'}`,
                ].join(' ')}
              >
                {cfg?.icon}
                {cfg?.label ?? mode}
                <span className="ml-1 opacity-60">{money(mTotal)}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Filtres ── */}
      <FiltersBar>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 w-full">

          <div className="md:col-span-2">
            <label className="label flex items-center gap-1.5">
              Recherche
              {qPaiements.isFetching && !qPaiements.isLoading && <Loader2 size={12} className="animate-spin text-gray-400" />}
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                className="input !pl-9 pr-9"
                placeholder="Référence, facture, mode…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
              {search && (
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 btn px-2 bg-gray-200 dark:bg-white/10" onClick={() => { setSearch(''); setPage(1) }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="label">Mode</label>
            <select className="input" value={fMode} onChange={(e) => { setFMode(e.target.value); setPage(1) }}>
              <option value="">Tous les modes</option>
              {Object.entries(MODE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Statut</label>
            <select className="input" value={fStatut} onChange={(e) => { setFStatut(e.target.value); setPage(1) }}>
              <option value="">Tous les statuts</option>
              <option value="recu">Reçu</option>
              <option value="en_attente">En attente</option>
              <option value="annule">Annulé</option>
            </select>
          </div>

          <div>
            <label className="label">Facture</label>
            <select className="input" value={fFactureId} onChange={(e) => { setFFactureId(e.target.value); setPage(1) }}>
              <option value="">Toutes</option>
              {factures.map((f) => (
                <option key={f.id} value={String(f.id)}>{f.numero ?? `Facture #${f.id}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Période</label>
            <div className="flex gap-1.5">
              <input type="date" className="input flex-1 min-w-0" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} title="Date début" />
              <input type="date" className="input flex-1 min-w-0" value={dateTo}   onChange={(e) => { setDateTo(e.target.value); setPage(1) }}   title="Date fin"   />
            </div>
          </div>

          <div className="flex items-end">
            <button type="button" className="btn bg-gray-200 dark:bg-white/10 w-full" onClick={clearFilters}>
              Réinitialiser
            </button>
          </div>
        </div>
      </FiltersBar>

      {/* ── Liste ── */}
      <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
        {/* List header */}
        <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_72px] md:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_72px] items-center gap-3 px-4 py-2 border-b border-black/[0.04] dark:border-white/[0.05] bg-gray-50/80 dark:bg-white/[0.02]">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">Date</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Facture</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Montant</span>
          <span className="hidden md:inline text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Mode</span>
          <span className="hidden md:inline text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Statut</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Actions</span>
        </div>

        {qPaiements.isLoading ? (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="h-3 w-24 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
                <div className="flex-1 h-3 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
                <div className="h-5 w-20 rounded-full bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
        ) : qPaiements.isError ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-5">
            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-3">
              <CreditCard size={20} className="text-red-400" />
            </div>
            <div className="text-sm font-semibold text-gray-500">Erreur chargement des paiements</div>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
              <CreditCard size={22} className="text-gray-300 dark:text-gray-600" />
            </div>
            <div className="text-base font-semibold text-gray-500 dark:text-gray-400">Aucun paiement trouvé</div>
            <div className="text-sm text-gray-400 dark:text-gray-600 mt-1 mb-4">
              {hasFilters ? 'Essayez de modifier vos filtres' : 'Enregistrez votre premier paiement'}
            </div>
            <button
              onClick={openCreate}
              className="inline-flex whitespace-nowrap items-center gap-2 rounded-lg bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition"
            >
              <Plus size={15} /> Nouveau paiement
            </button>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {pageItems.map((p: any) => {
              const factureLabel = p.facture?.numero ?? `#${p.facture_id}`
              const statut = String(p.statut ?? 'recu').toLowerCase()
              const isReceived = statut === 'recu' || statut === 'reçu'

              const actions = [
                { label: 'Voir', icon: <Eye size={15} />, onClick: () => openDetails(p) },
                ...(isAdmin ? [
                  { label: 'Modifier', icon: <Pencil size={15} />, onClick: () => openEdit(p) },
                  { label: 'Supprimer', icon: <Trash2 size={15} />, tone: 'danger' as const,
                    onClick: () => { setConfirmId(p.id); setConfirmName(p.reference ?? p.facture?.numero ?? `#${p.id}`) },
                  },
                ] : []),
              ]

              return (
                <div
                  key={p.id}
                  onClick={() => openDetails(p)}
                  className="group flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_72px] md:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_72px] sm:items-center gap-1 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-2 hover:bg-gray-50/80 dark:hover:bg-white/[0.025] transition-colors cursor-pointer"
                >
                  {/* Cell 1 : Date + (actions inline mobile) */}
                  <div className="flex items-center justify-between gap-2 min-w-0 sm:justify-start">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums truncate">
                      {fmtDate(p.date_paiement || p.created_at)}
                    </span>
                    <div onClick={(e) => e.stopPropagation()} className="flex sm:hidden shrink-0 -mr-1">
                      <ActionsMenu items={actions} />
                    </div>
                  </div>

                  {/* Cell 2 : Facture (sm+) */}
                  <div className="hidden sm:flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex items-center rounded-lg bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300 font-mono truncate max-w-full">
                      {factureLabel}
                    </span>
                  </div>

                  {/* Cell 3 : Montant (sm+) */}
                  <div className="hidden sm:flex items-center justify-center">
                    <span className={`text-sm font-bold tabular-nums ${
                      isReceived ? 'text-emerald-700 dark:text-emerald-400'
                        : statut === 'en_attente' ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-400'
                    }`}>
                      {Number(p.montant || 0).toLocaleString('fr-FR')}
                      <span className="ml-1 text-[10px] font-normal text-gray-400">XOF</span>
                    </span>
                  </div>

                  {/* Cell 4 : Mode (md+) */}
                  <div className="hidden md:flex items-center justify-center">
                    <ModeBadge mode={p.mode_paiement} />
                  </div>

                  {/* Cell 5 : Statut (md+) */}
                  <div className="hidden md:flex items-center justify-center">
                    <StatutBadge statut={p.statut} />
                  </div>

                  {/* Mobile summary (xs only) */}
                  <div className="flex sm:hidden flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-lg bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300 font-mono">
                        {factureLabel}
                      </span>
                      <ModeBadge mode={p.mode_paiement} />
                      <StatutBadge statut={p.statut} />
                    </div>
                    <span className={`text-sm font-bold tabular-nums shrink-0 ${
                      isReceived ? 'text-emerald-700 dark:text-emerald-400'
                        : statut === 'en_attente' ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-400'
                    }`}>
                      {Number(p.montant || 0).toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-gray-400">XOF</span>
                    </span>
                  </div>

                  {/* Cell 6 : Actions (sm+) */}
                  <div onClick={(e) => e.stopPropagation()} className="hidden sm:flex justify-center">
                    <ActionsMenu items={actions} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Pagination page={page} lastPage={lastPage} total={total} perPage={perPage} onPage={setPage} />

      {/* ── Modals ── */}
      <Modal
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setSelected(null) }}
        title="Détails du paiement"
        widthClass="max-w-2xl"
      >
        {selected ? <PaiementDetails paiement={selected} /> : null}
      </Modal>

      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        title={editing ? 'Modifier le paiement' : 'Nouveau paiement'}
        widthClass="max-w-2xl"
      >
        <PaiementsForm
          factures={factures}
          paiements={paiements}
          defaultValues={toDefaults(editing ?? undefined)}
          onSubmit={(vals) => (editing ? mUpdate.mutate(vals) : mCreate.mutate(vals))}
          onCancel={() => { setFormOpen(false); setEditing(null) }}
          submitting={mCreate.isPending || mUpdate.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={confirmId !== null}
        title="Supprimer ce paiement ?"
        message="Cette action est irréversible."
        itemName={confirmName}
        onCancel={() => { setConfirmId(null); setConfirmName(undefined) }}
        onConfirm={() => { if (confirmId != null) mDelete.mutate(confirmId); setConfirmId(null); setConfirmName(undefined) }}
      />
    </div>
  )
}
