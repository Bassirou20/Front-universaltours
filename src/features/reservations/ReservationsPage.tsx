// src/features/reservations/ReservationsPage.tsx
import React, { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useDebouncedValue, normalizePaged, money } from '../../lib/helpers'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { FiltersBar } from '../../ui/FiltersBar'
import { Modal } from '../../ui/Modal'
import { Pagination } from '../../ui/Pagination'
import { useToast } from '../../ui/Toasts'
import { ActionsMenu } from '../../ui/ActionsMenu'
import { useAuth } from '../../store/auth'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Plus, Search, Eye, Pencil, Trash2, CheckCircle2, XCircle, X,
  Receipt, FileText, RefreshCw, Loader2, FileSpreadsheet,
  Plane, Hotel, Car, PartyPopper, Package, Shield, Stamp,
  ClipboardList, CalendarCheck, AlertCircle, AlertTriangle,
} from 'lucide-react'
import { ReservationsForm, type ReservationInput } from './ReservationsForm'
import PenaltyModal from './PenaltyModal'

// helper acompte
async function applyAcompte(reservationId: number, acompte: any) {
  const montant = Number(acompte?.montant || 0)
  if (!reservationId || montant <= 0) return
  await api.post(`/reservations/${reservationId}/encaisser`, {
    montant,
    mode_paiement: acompte.mode_paiement || 'especes',
    reference:     acompte.reference     || null,
    date_paiement: new Date().toISOString().slice(0, 10),
  })
}

// Visual metadata per reservation type
const TYPE_META: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  billet_avion: { label: "Billet d'avion", icon: <Plane size={14} />,       bg: 'bg-sky-100 dark:bg-sky-500/15',         text: 'text-sky-700 dark:text-sky-300' },
  hotel:        { label: 'Hôtel',          icon: <Hotel size={14} />,       bg: 'bg-emerald-100 dark:bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300' },
  voiture:      { label: 'Voiture',        icon: <Car size={14} />,         bg: 'bg-amber-100 dark:bg-amber-500/15',     text: 'text-amber-700 dark:text-amber-300' },
  evenement:    { label: 'Événement',      icon: <PartyPopper size={14} />, bg: 'bg-violet-100 dark:bg-violet-500/15',   text: 'text-violet-700 dark:text-violet-300' },
  forfait:      { label: 'Forfait',        icon: <Package size={14} />,     bg: 'bg-indigo-100 dark:bg-indigo-500/15',   text: 'text-indigo-700 dark:text-indigo-300' },
  assurance:    { label: 'Assurance',      icon: <Shield size={14} />,      bg: 'bg-rose-100 dark:bg-rose-500/15',       text: 'text-rose-700 dark:text-rose-300' },
  evisa:        { label: 'E-Visa',         icon: <Stamp size={14} />,       bg: 'bg-teal-100 dark:bg-teal-500/15',       text: 'text-teal-700 dark:text-teal-300' },
}
const DEFAULT_TYPE_META = { label: '—', icon: <ClipboardList size={14} />, bg: 'bg-gray-100 dark:bg-white/10', text: 'text-gray-600 dark:text-gray-300' }

function typeMetaFor(t: any) {
  const key = String(t || '').toLowerCase()
  return TYPE_META[key] || DEFAULT_TYPE_META
}

function initialsFromClient(c: any) {
  const a = String(c?.prenom || '').trim()[0] || ''
  const b = String(c?.nom || '').trim()[0] || ''
  return (a + b).toUpperCase() || '??'
}

// -------------------- helpers --------------------
const statutLabel = (s: any) => {
  const v = String(s || '').toLowerCase()
  if (v === 'confirmee' || v === 'confirmée') return 'Confirmée'
  if (v === 'annulee' || v === 'annulée') return 'Annulée'
  if (v === 'brouillon') return 'Brouillon'
  if (v === 'en_attente') return 'En attente'
  return s ?? '—'
}

function StatusBadge({ statut }: { statut: any }) {
  const v = String(statut || '').toLowerCase()
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap'

  const cls =
    v === 'confirmee' || v === 'confirmée'
      ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
      : v === 'annulee' || v === 'annulée'
      ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
      : v === 'brouillon'
      ? 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'

  return <span className={`${base} ${cls}`}>{statutLabel(statut)}</span>
}

function computePaymentSummaryFromReservation(r: any): {
  total: number
  paid: number
  percent: number
  label: string
  tone: 'gray' | 'amber' | 'green'
} {
  const pickFactureObject = (rr: any) => {
    if (!rr) return null
    if (rr.facture && typeof rr.facture === 'object') return rr.facture
    if (rr.factures && typeof rr.factures === 'object' && !Array.isArray(rr.factures) && rr.factures.id) return rr.factures

    const fs = rr.factures
    let arr: any[] = []
    if (Array.isArray(fs)) arr = fs
    else if (Array.isArray(fs?.data)) arr = fs.data
    else if (Array.isArray(fs?.items)) arr = fs.items
    if (!arr.length) return null

    const sorted = [...arr].sort((a, b) => {
      const da = new Date(a?.created_at || a?.date_facture || 0).getTime()
      const db = new Date(b?.created_at || b?.date_facture || 0).getTime()
      return db - da
    })
    return sorted[0] ?? null
  }

  const f = pickFactureObject(r)

  const total =
    Number(
      f?.total ??
        f?.total_ttc ??
        f?.montant_total ??
        f?.montant_ttc ??
        f?.total_amount ??
        r?.montant_total ??
        0
    ) || 0

  const paiementsRaw = f?.paiements ?? r?.paiements ?? []
  const paiements: any[] = Array.isArray(paiementsRaw)
    ? paiementsRaw
    : Array.isArray(paiementsRaw?.data)
    ? paiementsRaw.data
    : Array.isArray(paiementsRaw?.items)
    ? paiementsRaw.items
    : []

  const paid = paiements.reduce((sum, p) => {
    const st = String(p?.statut ?? '').toLowerCase()
    const montant = Number(p?.montant ?? 0) || 0
    if (!p?.statut) return sum + montant
    if (st === 'recu' || st === 'reçu') return sum + montant
    return sum
  }, 0)

  const safeTotal = total > 0 ? total : 0
  const percent = safeTotal > 0 ? Math.max(0, Math.min(100, Math.round((paid / safeTotal) * 100))) : 0

  if (paid <= 0) return { total, paid, percent: 0, label: 'Non payé', tone: 'gray' }
  if (safeTotal > 0 && paid >= safeTotal) return { total, paid, percent: 100, label: 'Payé', tone: 'green' }
  return { total, paid, percent, label: 'Partiel', tone: 'amber' }
}

function PaymentBadge({ reservation }: { reservation: any }) {
  const base = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap'
  const s = computePaymentSummaryFromReservation(reservation)

  const cls =
    s.tone === 'green'
      ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
      : s.tone === 'amber'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
      : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200'

  const showPct = (s.total ?? 0) > 0

  return (
    <span className={`${base} ${cls}`} title={showPct ? `${s.paid}/${s.total} (${s.percent}%)` : undefined}>
      <span>{s.label}</span>
      {showPct ? <span className="opacity-80">• {s.percent}%</span> : null}
    </span>
  )
}

function buildMonthOptions(count = 12) {
  const out: Array<{ value: string; label: string }> = []
  const now = new Date()
  const base = new Date(now.getFullYear(), now.getMonth(), 1)

  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const value = `${yyyy}-${mm}`
    const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    out.push({ value, label })
  }
  return out
}

type Reservation = any

export default function ReservationsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const { user } = useAuth()
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin'

  const [page, setPage] = useState(1)
  const perPage = 10

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [type, setType] = useState<string>('')
  const [statut, setStatut] = useState<string>(sp.get('statut') ?? '')
  const [dateFilter, setDateFilter] = useState<string>(sp.get('date') ?? '')

  const [month, setMonth] = useState<string>('')
  const [exportMonth, setExportMonth] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const [clientIdFilter, setClientIdFilter] = useState<number | null>(null)
  const [clientLabelFilter, setClientLabelFilter] = useState<string>('')

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id?: number; name?: string }>({ open: false })

  // ── form modal state ──
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [prefillCreate, setPrefillCreate] = useState<Partial<ReservationInput> | undefined>(undefined)

  // ── penalty modal state ──
  const [penaltyTarget, setPenaltyTarget] = useState<any | null>(null)

  const monthOptions = useMemo(() => buildMonthOptions(12), [])

  // -------------------- Queries --------------------
  const q = useQuery({
    queryKey: ['reservations', { page, perPage, search: debouncedSearch, type, statut, month, dateFilter, clientIdFilter }] as const,
    queryFn: async () => {
      const { data } = await api.get('/reservations', {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          type: type || undefined,
          statut: statut || undefined,
          month: month || undefined,
          date: dateFilter || undefined,
          client_id: clientIdFilter || undefined,
        },
      })
      return data
    },
    placeholderData: keepPreviousData,
  })

  const refreshList = () => {
    q.refetch()
  }

  useEffect(() => {
    const cid   = sp.get('client_id')
    const label = sp.get('client_label') || ''

    if (cid) {
      const idNum = Number(cid)
      if (!Number.isNaN(idNum)) {
        setClientIdFilter(idNum)
        setClientLabelFilter(label ? decodeURIComponent(label) : `Client #${idNum}`)
        setPage(1)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Synchronise statut + date avec l'URL (pour les liens "Épinglés" depuis la sidebar)
  useEffect(() => {
    const urlStatut = sp.get('statut') ?? ''
    const urlDate = sp.get('date') ?? ''
    if (urlStatut !== statut) { setStatut(urlStatut); setPage(1) }
    if (urlDate !== dateFilter) { setDateFilter(urlDate); setPage(1) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp])

  const paged = useMemo(() => normalizePaged(q.data), [q.data])
  const rows: Reservation[] = useMemo(() => paged.items ?? [], [paged.items])

  // -------------------- Facture helpers --------------------
  const pickFactureIdFromReservation = (r: any): number | null => {
    if (!r) return null
    if (r.facture?.id) return Number(r.facture.id)
    if (r.factures?.id) return Number(r.factures.id)

    const fs = r.factures
    let arr: any[] = []
    if (Array.isArray(fs)) arr = fs
    else if (Array.isArray(fs?.data)) arr = fs.data
    else if (Array.isArray(fs?.items)) arr = fs.items
    if (!arr.length) return null

    const sorted = [...arr].sort((a, b) => {
      const da = new Date(a?.created_at || a?.date_facture || 0).getTime()
      const db = new Date(b?.created_at || b?.date_facture || 0).getTime()
      return db - da
    })
    return sorted[0]?.id ? Number(sorted[0].id) : null
  }

  const getFactureIdForReservation = async (reservationId: number): Promise<number | null> => {
    const { data } = await api.get(`/reservations/${reservationId}`)
    const r = data?.data ?? data
    return pickFactureIdFromReservation(r)
  }

  const downloadFacturePdf = async (factureId: number, filename?: string) => {
    const res = await api.get(`/factures/${factureId}/pdf`, { responseType: 'blob' })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename || `facture-${factureId}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()

    window.URL.revokeObjectURL(url)
  }

  const downloadDevisPdf = async (reservationId: number) => {
    try {
      const res = await api.get(`/reservations/${reservationId}/devis-pdf`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Impossible de générer le devis.'
      toast.push({ title: msg, tone: 'error' })
    }
  }

  // -------------------- Mutations --------------------
  const mCreate = useMutation({
    mutationFn: async (vals: ReservationInput) => {
      const { acompte, ...raw } = vals as any
      // Si as_devis=true, laisse le backend choisir statut=en_attente.
      // Sinon, force confirmee (comportement historique pour les autres cas).
      const body = raw?.as_devis ? raw : { ...raw, statut: 'confirmee' }
      const res = await api.post('/reservations', body)
      return { reservation: res.data?.data ?? res.data, acompte, asDevis: !!raw?.as_devis }
    },
    onSuccess: async ({ reservation: created, acompte, asDevis }) => {
      try { await applyAcompte(created?.id, acompte) } catch { /* acompte optionnel */ }
      qc.invalidateQueries({ queryKey: ['reservations'] })
      toast.push({
        title: asDevis
          ? 'Devis créé ✓ — envoyez-le au client via WhatsApp'
          : Number(acompte?.montant || 0) > 0
          ? 'Réservation créée + acompte enregistré ✓'
          : 'Réservation créée ✓',
        tone: 'success',
      })
      setFormOpen(false)
      setEditing(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la création.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  const mUpdate = useMutation({
    mutationFn: async (vals: ReservationInput) => {
      const { acompte, id, ...payload } = vals as any
      const res = await api.put(`/reservations/${id}`, payload)
      return { reservation: res.data?.data ?? res.data, acompte }
    },
    onSuccess: async ({ reservation: updated, acompte }) => {
      try { await applyAcompte(updated?.id, acompte) } catch { /* acompte optionnel */ }
      qc.invalidateQueries({ queryKey: ['reservations'] })
      toast.push({
        title: Number(acompte?.montant || 0) > 0
          ? 'Réservation mise à jour + acompte enregistré ✓'
          : 'Réservation mise à jour ✓',
        tone: 'success',
      })
      setFormOpen(false)
      setEditing(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la mise à jour.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  // Helper : applique une mise à jour optimiste sur toutes les queries 'reservations'
  // — l'UI réagit instantanément, rollback automatique si l'API échoue.
  const optimisticPatch = (id: number, patch: Partial<{ statut: string }> | 'delete') => {
    const previousSnapshots: Array<[any, any]> = []
    const queries = qc.getQueryCache().findAll({ queryKey: ['reservations'] })
    queries.forEach((query) => {
      const old: any = qc.getQueryData(query.queryKey)
      if (!old) return
      previousSnapshots.push([query.queryKey, old])
      const rowsKey =
        Array.isArray(old?.data) ? 'data'
        : Array.isArray(old?.items) ? 'items'
        : null
      if (!rowsKey) return
      const updated = {
        ...old,
        [rowsKey]: patch === 'delete'
          ? old[rowsKey].filter((r: any) => r.id !== id)
          : old[rowsKey].map((r: any) => (r.id === id ? { ...r, ...patch } : r)),
      }
      qc.setQueryData(query.queryKey, updated)
    })
    return previousSnapshots
  }

  const rollback = (snapshots: Array<[any, any]>) => {
    snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
  }

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/reservations/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['reservations'] })
      return { snapshots: optimisticPatch(id, 'delete') }
    },
    onSuccess: () => {
      toast.push({ title: 'Réservation supprimée', tone: 'success' })
    },
    onError: (err: any, _id, ctx: any) => {
      if (ctx?.snapshots) rollback(ctx.snapshots)
      const msg = err?.response?.data?.message || 'Erreur lors de la suppression.'
      toast.push({ title: msg, tone: 'error' })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })

  const mConfirmer = useMutation({
    mutationFn: (id: number) => api.post(`/reservations/${id}/confirmer`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['reservations'] })
      return { snapshots: optimisticPatch(id, { statut: 'confirmee' }) }
    },
    onSuccess: () => {
      toast.push({ title: 'Réservation confirmée', tone: 'success' })
    },
    onError: (err: any, _id, ctx: any) => {
      if (ctx?.snapshots) rollback(ctx.snapshots)
      const msg = err?.response?.data?.message || 'Impossible de confirmer.'
      toast.push({ title: msg, tone: 'error' })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })

  const mAnnuler = useMutation({
    mutationFn: (id: number) => api.post(`/reservations/${id}/annuler`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['reservations'] })
      return { snapshots: optimisticPatch(id, { statut: 'annulee' }) }
    },
    onSuccess: () => {
      toast.push({ title: 'Réservation annulée', tone: 'success' })
    },
    onError: (err: any, _id, ctx: any) => {
      if (ctx?.snapshots) rollback(ctx.snapshots)
      const msg = err?.response?.data?.message || "Impossible d'annuler."
      toast.push({ title: msg, tone: 'error' })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })

  const isPendingMutation = mDelete.isPending || mConfirmer.isPending || mAnnuler.isPending || mCreate.isPending || mUpdate.isPending

  // -------------------- actions helpers --------------------
  const openCreate = () => {
    setEditing(null)
    setPrefillCreate(clientIdFilter ? ({ client_id: clientIdFilter } as Partial<ReservationInput>) : undefined)
    setFormOpen(true)
  }

  const openEdit = (r: any) => {
    setEditing(r)
    setPrefillCreate(undefined)
    setFormOpen(true)
  }

  const openDetails = (rOrId: any) => {
    const id = typeof rOrId === 'number' ? rOrId : rOrId?.id ?? rOrId?.reservation_id ?? null
    if (!id) {
      toast.push({ title: "Impossible d'ouvrir: ID manquant.", tone: 'error' })
      return
    }
    navigate(`/reservations/${id}`)
  }

  const askDelete = (id: number, name: string) => setConfirmDelete({ open: true, id, name })
  const doDelete = () => {
    if (confirmDelete.id) mDelete.mutate(confirmDelete.id)
    setConfirmDelete({ open: false })
  }

  const viewClientHistory = (clientId: number, label?: string) => {
    setClientIdFilter(clientId)
    setClientLabelFilter(label || `Client #${clientId}`)
    setPage(1)
    toast.push({ title: 'Historique du client affiché', tone: 'info' })
  }

  const clearClientHistoryFilter = () => {
    setClientIdFilter(null)
    setClientLabelFilter('')
    setPage(1)
  }

  // -------------------- render --------------------
  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <CalendarCheck size={16} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">Réservations</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
              {paged.total ?? 0} réservation{(paged.total ?? 0) > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={refreshList}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors whitespace-nowrap"
            title="Actualiser la liste"
          >
            <RefreshCw size={14} className={q.isFetching ? 'animate-spin' : ''} />
            Actualiser
          </button>

          <div className="flex items-center rounded-lg overflow-hidden border border-emerald-600/70 shadow-sm">
            <select
              value={exportMonth}
              onChange={(e) => setExportMonth(e.target.value)}
              className="h-full px-2 py-1.5 text-sm bg-white dark:bg-[#151d2e] text-gray-700 dark:text-gray-200 border-r border-emerald-600/70 focus:outline-none cursor-pointer"
              title="Mois à exporter"
            >
              <option value="">Tous les mois</option>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await api.get('/reservations/export', {
                    params: {
                      search:    debouncedSearch   || undefined,
                      type:      type              || undefined,
                      month:     exportMonth       || undefined,
                      client_id: clientIdFilter    || undefined,
                    },
                    responseType: 'blob',
                  })
                  const url = URL.createObjectURL(res.data)
                  const a   = document.createElement('a')
                  a.href    = url
                  a.download = `reservations-${exportMonth || 'complet'}.xlsx`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch {
                  toast.push({ title: "Erreur lors de l'export Excel.", tone: 'error' })
                }
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="Télécharger le fichier Excel"
            >
              <FileSpreadsheet size={14} />
              Exporter
            </button>
          </div>

          <button
            type="button"
            className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition shadow-sm"
            onClick={openCreate}
          >
            <Plus size={15} /> Nouvelle réservation
          </button>
        </div>
      </div>

      {/* Chip filtre client actif */}
      {clientIdFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-3 py-1.5 text-sm">
            <span className="text-sky-600 dark:text-sky-400 font-medium">
              Historique : {clientLabelFilter || `Client #${clientIdFilter}`}
            </span>
            <button type="button" className="text-sky-400 hover:text-sky-700 dark:hover:text-sky-200" onClick={clearClientHistoryFilter} title="Retirer">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <FiltersBar>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px] gap-3 w-full">
          {/* Recherche */}
          <div>
            <label className="label flex items-center gap-1.5">
              Recherche
              {q.isFetching && !q.isLoading && <Loader2 size={12} className="animate-spin text-gray-400" />}
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="input !pl-9 pr-10"
                placeholder="Référence, client…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
              {search ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn px-2 bg-gray-200 dark:bg-white/10"
                  onClick={() => { setSearch(''); setPage(1) }}
                  title="Effacer"
                ><X size={13} /></button>
              ) : null}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="label">Type</label>
            <select className="input" value={type} onChange={(e) => { setType(e.target.value); setPage(1) }}>
              <option value="">Tous les types</option>
              <option value="billet_avion">Billet d'avion</option>
              <option value="hotel">Hôtel</option>
              <option value="voiture">Voiture</option>
              <option value="evenement">Événement</option>
              <option value="forfait">Forfait</option>
              <option value="assurance">Assurance</option>
              <option value="evisa">E-Visa</option>
            </select>
          </div>

          {/* Mois */}
          <div>
            <label className="label">Mois</label>
            <select className="input" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1) }}>
              <option value="">Tous les mois</option>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </FiltersBar>

      {/* ── Table / Liste ── */}
      <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
        {/* List header — visible sm+, colonnes apparaissent progressivement */}
        <div className="hidden sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_72px] md:grid-cols-[minmax(0,2.2fr)_100px_minmax(0,1.4fr)_minmax(0,1fr)_72px] items-center gap-3 px-4 py-2 border-b border-black/[0.04] dark:border-white/[0.05] bg-gray-50/80 dark:bg-white/[0.02]">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">Client · Référence</span>
          <span className="hidden md:inline text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Date</span>
          <span className="hidden md:inline text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Total · Paiement</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Statut</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Actions</span>
        </div>

        {q.isLoading ? (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="h-7 w-7 rounded-full bg-black/[0.06] dark:bg-white/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 h-3 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-20 rounded bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
                <div className="h-3 w-24 rounded bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
        ) : q.isError ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-5">
            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-3">
              <AlertCircle size={20} className="text-red-400" />
            </div>
            <div className="text-sm font-semibold text-gray-500">Impossible de charger les réservations</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
              <CalendarCheck size={22} className="text-gray-300 dark:text-gray-600" />
            </div>
            <div className="text-base font-semibold text-gray-500 dark:text-gray-400">Aucune réservation trouvée</div>
            <div className="text-sm text-gray-400 dark:text-gray-600 mt-1 mb-4">
              Commencez par créer une réservation
            </div>
            <button
              onClick={openCreate}
              className="inline-flex whitespace-nowrap items-center gap-2 rounded-lg bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition"
            >
              <Plus size={15} /> Nouvelle réservation
            </button>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {rows.map((r: any) => {
              const clientName = [r?.client?.prenom, r?.client?.nom].filter(Boolean).join(' ') || r?.client?.nom || '—'
              const ini = initialsFromClient(r?.client)
              const tMeta = typeMetaFor(r?.type)
              const pay = computePaymentSummaryFromReservation(r)
              const totalDisplay = Number(r?.montant_total ?? pay.total ?? 0)

              const canConfirm = r?.statut === 'en_attente' || r?.statut === 'brouillon'
              const canCancel  = r?.statut !== 'annulee' && r?.statut !== 'annulée'
              const factureId = pickFactureIdFromReservation(r)

              const actions = [
                { label: 'Voir', icon: <Eye size={15} />, onClick: () => openDetails(r) },
                { label: 'Modifier', icon: <Pencil size={15} />, onClick: () => openEdit(r) },
                { label: 'Devis (PDF)', icon: <FileText size={15} />, onClick: () => downloadDevisPdf(r.id) },
                {
                  label: 'Télécharger facture',
                  icon: <Receipt size={15} />,
                  disabled: isPendingMutation,
                  onClick: async () => {
                    try {
                      const id = factureId ?? (await getFactureIdForReservation(r.id))
                      if (!id) {
                        toast.push({ title: 'Aucune facture trouvée pour cette réservation.', tone: 'error' })
                        return
                      }
                      await downloadFacturePdf(id, `facture-${id}.pdf`)
                    } catch (err: any) {
                      toast.push({ title: err?.response?.data?.message || 'Impossible de télécharger la facture.', tone: 'error' })
                    }
                  },
                },
                { label: 'Confirmer', icon: <CheckCircle2 size={15} />, disabled: !canConfirm || isPendingMutation, onClick: () => mConfirmer.mutate(r.id) },
                { label: 'Annuler avec pénalité', icon: <AlertTriangle size={15} />, disabled: !canCancel || isPendingMutation, onClick: () => setPenaltyTarget(r) },
                { label: 'Annuler (simple)',  icon: <XCircle size={15} />, disabled: !canCancel || isPendingMutation, onClick: () => mAnnuler.mutate(r.id) },
                ...(isAdmin ? [{ label: 'Supprimer', icon: <Trash2 size={15} />, tone: 'danger' as const, disabled: isPendingMutation, onClick: () => askDelete(r.id, r.reference ?? `#${r.id}`) }] : []),
              ]

              const payTone = pay.tone === 'green' ? 'bg-emerald-500' : pay.tone === 'amber' ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'

              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`/reservations/${r.id}`)}
                  className="group flex flex-col sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_72px] md:grid-cols-[minmax(0,2.2fr)_100px_minmax(0,1.4fr)_minmax(0,1fr)_72px] sm:items-center gap-1 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-2 hover:bg-gray-50/80 dark:hover:bg-white/[0.025] transition-colors cursor-pointer"
                >
                  {/* Cell 1 : Avatar + client + (Actions inline on mobile, hidden on sm+) */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tMeta.bg} ${tMeta.text}`} title={tMeta.label}>
                      {tMeta.icon}
                    </div>
                    <div className="min-w-0 flex-1 flex items-baseline gap-1.5 overflow-hidden">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={clientName}>{clientName}</span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate hidden lg:inline min-w-0" title={r.reference || `#${r.id}`}>
                        · {r.reference || `#${r.id}`}
                      </span>
                    </div>
                    {/* Actions à droite sur mobile uniquement */}
                    <div onClick={(e) => e.stopPropagation()} className="flex sm:hidden shrink-0 -mr-1">
                      <ActionsMenu items={actions} />
                    </div>
                  </div>

                  {/* Cell 2 : Date */}
                  <div className="hidden md:block text-sm text-gray-600 dark:text-gray-300 tabular-nums truncate text-center">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                  </div>

                  {/* Cell 3 : Montant + mini progress (progress visible lg+) */}
                  <div className="hidden md:flex items-center justify-center gap-2 min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
                      {totalDisplay.toLocaleString('fr-FR')}<span className="text-[10px] font-normal text-gray-400 ml-1">XOF</span>
                    </div>
                    {pay.total > 0 && (
                      <div className="hidden lg:flex items-center gap-2 shrink-0">
                        <div className="h-1 w-10 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                          <div className={`h-full rounded-full ${payTone}`} style={{ width: `${pay.percent}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400 tabular-nums">{pay.percent}%</span>
                      </div>
                    )}
                  </div>

                  {/* Cell 4 : Statut (sm+) */}
                  <div className="hidden sm:flex items-center justify-center">
                    <StatusBadge statut={r.statut} />
                  </div>

                  {/* Mobile summary (xs only) — type, statut, date, montant alignés */}
                  <div className="flex sm:hidden flex-wrap items-center justify-between gap-2 pl-9">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${tMeta.bg} ${tMeta.text}`}>
                        {tMeta.icon}<span>{tMeta.label}</span>
                      </span>
                      <StatusBadge statut={r.statut} />
                      {r.created_at && (
                        <span className="text-[10px] text-gray-400 tabular-nums">
                          {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
                      {totalDisplay.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-gray-400">XOF</span>
                    </span>
                  </div>

                  {/* Cell 5 : Actions (sm+ only — sur mobile elles sont inline cell 1) */}
                  <div onClick={(e) => e.stopPropagation()} className="hidden sm:flex justify-center">
                    <ActionsMenu items={actions} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Pagination page={paged.page} lastPage={paged.lastPage} total={paged.total} perPage={perPage} onPage={setPage} />

      <ConfirmDialog
        open={confirmDelete.open}
        onCancel={() => setConfirmDelete({ open: false })}
        onConfirm={doDelete}
        title="Supprimer cette réservation ?"
        message="Cette action est irréversible."
        itemName={confirmDelete.name}
      />

      {/* ── Modal formulaire ── */}
      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        title={editing ? 'Modifier la réservation' : 'Nouvelle réservation'}
        widthClass="max-w-4xl"
      >
        <ReservationsForm
          defaultValues={editing ?? prefillCreate}
          submitting={mCreate.isPending || mUpdate.isPending}
          onCancel={() => { setFormOpen(false); setEditing(null) }}
          onSubmit={(vals) => {
            if (editing) mUpdate.mutate({ ...vals, id: editing.id } as any)
            else         mCreate.mutate(vals)
          }}
        />
      </Modal>

      {/* Modal pénalité (annuler avec pénalité) */}
      <PenaltyModal
        open={!!penaltyTarget}
        onClose={() => setPenaltyTarget(null)}
        reservation={penaltyTarget || { id: 0 }}
        withCancel={true}
        onSuccess={() => q.refetch()}
      />

    </div>
  )
}
