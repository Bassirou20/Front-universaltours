// src/features/reservations/ReservationsPage.tsx
import React, { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import Modal from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { FiltersBar } from '../../ui/FiltersBar'
import { Pagination } from '../../ui/Pagination'
import { T, Th, Td } from '../../ui/Table'
import { useToast } from '../../ui/Toasts'
import { ActionsMenu } from '../../ui/ActionsMenu'
import { ReservationsForm, type ReservationInput } from './ReservationsForm'
import { ReservationDetails } from './ReservationDetails'
import { useAuth } from '../../store/auth'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, Trash2, CheckCircle2, XCircle, X, Receipt, FileText, RefreshCw  } from 'lucide-react'

// -------------------- helpers --------------------
function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const normalizePaged = (input: any) => {
  const items = Array.isArray(input?.data) ? input.data : Array.isArray(input?.items) ? input.items : []
  return {
    items,
    page: input?.current_page ?? input?.page ?? 1,
    lastPage: input?.last_page ?? input?.lastPage ?? 1,
    total: input?.total ?? 0,
  }
}

const money = (n: any, devise = 'XOF') => `${Number(n || 0).toLocaleString()} ${devise}`

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

/**
 * Paiement badge:
 * calcule paid depuis facture->paiements.
 */
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

// ✅ options "mois"
function buildMonthOptions(count = 12) {
  const out: Array<{ value: string; label: string }> = []
  const now = new Date()
  // on se place au 1er du mois pour éviter les bugs de date
  const base = new Date(now.getFullYear(), now.getMonth(), 1)

  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const value = `${yyyy}-${mm}` // YYYY-MM
    const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    out.push({ value, label })
  }
  return out
}

type Reservation = any

export default function ReservationsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [sp] = useSearchParams()
  const [prefillCreate, setPrefillCreate] = useState<{ client_id?: number } | null>(null)
  const refreshList = () => {
    q.refetch()
  }

  const { user } = useAuth()
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin'

  const [page, setPage] = useState(1)
  const perPage = 10

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [type, setType] = useState<string>('')

  // ✅ remplace "statut" par "month"
  const [month, setMonth] = useState<string>('') // format YYYY-MM

  const [clientIdFilter, setClientIdFilter] = useState<number | null>(null)
  const [clientLabelFilter, setClientLabelFilter] = useState<string>('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Reservation | null>(null)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [viewingId, setViewingId] = useState<number | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id?: number }>({ open: false })

  const monthOptions = useMemo(() => buildMonthOptions(12), [])

  useEffect(() => {
    const cid = sp.get('client_id')
    const label = sp.get('client_label') || ''
    const create = sp.get('create')

    if (cid) {
      const idNum = Number(cid)
      if (!Number.isNaN(idNum)) {
        setClientIdFilter(idNum)
        setClientLabelFilter(label ? decodeURIComponent(label) : `Client #${idNum}`)
        setPage(1)
      }
    }

    if (create === '1' && cid) {
      const idNum = Number(cid)
      if (!Number.isNaN(idNum)) {
        setPrefillCreate({ client_id: idNum })
        setEditing(null)
        setFormOpen(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const patchReservationInCache = (id: number, patch: Partial<any>) => {
    qc.setQueriesData({ queryKey: ['reservations'] }, (old: any) => {
      if (!old) return old
      const data = old?.data ?? old
      const items = Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : null
      if (!items) return old

      const nextItems = items.map((r: any) => (Number(r.id) === Number(id) ? { ...r, ...patch } : r))

      if (Array.isArray(data?.data)) return { ...old, data: { ...data, data: nextItems } }
      if (Array.isArray(data?.items)) return { ...old, items: nextItems }
      return old
    })

    qc.setQueryData(['reservation', id], (old: any) => {
      if (!old) return old
      const data = old?.data ?? old
      const next = { ...data, ...patch }
      return old?.data ? { ...old, data: next } : next
    })
  }

  // -------------------- Queries --------------------
  const q = useQuery({
    queryKey: ['reservations', { page, perPage, search: debouncedSearch, type, month, clientIdFilter }] as const,
    queryFn: async () => {
      const { data } = await api.get('/reservations', {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          type: type || undefined,
          month: month || undefined, // ✅ filtre mois (YYYY-MM)
          client_id: clientIdFilter || undefined,
        },
      })
      return data
    },
    placeholderData: keepPreviousData,
  })

  const paged = useMemo(() => normalizePaged(q.data), [q.data])
  const rows: Reservation[] = useMemo(() => paged.items ?? [], [paged.items])

  const qDetails = useQuery({
    queryKey: ['reservation', viewingId] as const,
    enabled: detailsOpen && !!viewingId,
    queryFn: async () => {
      const { data } = await api.get(`/reservations/${viewingId}`)
      return data
    },
  })

  const viewingReservation = useMemo(() => {
    const d: any = qDetails.data
    if (!d) return null
    return d?.data ?? d
  }, [qDetails.data])

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

  // ✅ helper: enregistrer acompte (create OU update)
  const applyAcompteToReservation = async (reservation: any, acompte: any) => {
    const montant = Number(acompte?.montant || 0)
    if (!reservation?.id || montant <= 0) return

    const date_facture = new Date().toISOString().slice(0, 10)

    const factureRes = await api.post(`/reservations/${reservation.id}/factures`, { date_facture })
    const facture = factureRes.data?.data ?? factureRes.data

    try {
      await api.post(`/factures/${facture.id}/emettre`)
    } catch {}

    await api.post(`/factures/${facture.id}/paiements`, {
      montant,
      mode_paiement: acompte.mode_paiement,
      reference: acompte.reference || null,
      statut: 'recu',
    })
  }

  // -------------------- Mutations --------------------
  const mCreate = useMutation({
    mutationFn: async (vals: ReservationInput) => {
      const { acompte, ...raw } = vals as any
      const payload = { ...raw, statut: 'confirmee' }
      const res = await api.post('/reservations', payload)
      return { reservation: res.data?.data ?? res.data, acompte }
    },
    onSuccess: async ({ reservation, acompte }) => {
      try {
        qc.invalidateQueries({ queryKey: ['reservations'] })
        setFormOpen(false)
        setEditing(null)

        await applyAcompteToReservation(reservation, acompte)

        toast.push({
          title: Number(acompte?.montant || 0) > 0 ? 'Réservation confirmée + acompte enregistré' : 'Réservation confirmée',
          tone: 'success',
        })
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Réservation créée, mais échec lors de l'enregistrement de l'acompte."
        toast.push({ title: msg, tone: 'error' })
      } finally {
        qc.invalidateQueries({ queryKey: ['reservations'] })
      }
    },
  })

  const mUpdate = useMutation({
    mutationFn: async (vals: ReservationInput) => {
      const { acompte, ...payload } = vals as any
      const res = await api.put(`/reservations/${editing?.id}`, payload)
      return { reservation: res.data?.data ?? res.data, acompte }
    },
    onSuccess: async ({ reservation, acompte }) => {
      try {
        qc.invalidateQueries({ queryKey: ['reservations'] })
        if (reservation?.id) qc.invalidateQueries({ queryKey: ['reservation', reservation.id] })

        const montant = Number(acompte?.montant || 0)
        if (reservation?.id && montant > 0) {
          const date_facture = new Date().toISOString().slice(0, 10)
          const factureRes = await api.post(`/reservations/${reservation.id}/factures`, { date_facture })
          const facture = factureRes.data?.data ?? factureRes.data

          try {
            await api.post(`/factures/${facture.id}/emettre`)
          } catch {}

          await api.post(`/factures/${facture.id}/paiements`, {
            montant,
            mode_paiement: acompte?.mode_paiement || 'especes',
            reference: acompte?.reference || null,
            statut: 'recu',
          })

          toast.push({ title: 'Réservation mise à jour + acompte enregistré', tone: 'success' })
        } else {
          toast.push({ title: 'Réservation mise à jour', tone: 'success' })
        }

        setFormOpen(false)
        setEditing(null)
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Réservation modifiée, mais échec lors de l'enregistrement de l'acompte."
        toast.push({ title: msg, tone: 'error' })
      } finally {
        qc.invalidateQueries({ queryKey: ['reservations'] })
        if (reservation?.id) qc.invalidateQueries({ queryKey: ['reservation', reservation.id] })
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la mise à jour.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/reservations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      toast.push({ title: 'Réservation supprimée', tone: 'success' })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la suppression.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  const mConfirmer = useMutation({
    mutationFn: (id: number) => api.post(`/reservations/${id}/confirmer`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['reservations'] })
      patchReservationInCache(id, { statut: 'confirmee' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      if (detailsOpen && viewingId) qc.invalidateQueries({ queryKey: ['reservation', viewingId] })
      toast.push({ title: 'Réservation confirmée', tone: 'success' })
    },
    onError: (err: any, id) => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['reservation', id] })
      const msg = err?.response?.data?.message || 'Impossible de confirmer.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  const mAnnuler = useMutation({
    mutationFn: (id: number) => api.post(`/reservations/${id}/annuler`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['reservations'] })
      patchReservationInCache(id, { statut: 'annulee' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      if (detailsOpen && viewingId) qc.invalidateQueries({ queryKey: ['reservation', viewingId] })
      toast.push({ title: 'Réservation annulée', tone: 'success' })
    },
    onError: (err: any, id) => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['reservation', id] })
      const msg = err?.response?.data?.message || "Impossible d'annuler."
      toast.push({ title: msg, tone: 'error' })
    },
  })

  const isPendingMutation =
    mCreate.isPending || mUpdate.isPending || mDelete.isPending || mConfirmer.isPending || mAnnuler.isPending

  // -------------------- actions helpers --------------------
  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = async (r: any) => {
    try {
      const { data } = await api.get(`/reservations/${r.id}`)
      const full = data?.data ?? data
      setEditing(full)
      setFormOpen(true)
    } catch (err: any) {
      toast.push({ title: 'Impossible de charger la réservation pour modification.', tone: 'error' })
    }
  }

  const openDetails = (rOrId: any) => {
    const id = typeof rOrId === 'number' ? rOrId : rOrId?.id ?? rOrId?.reservation_id ?? null
    if (!id) {
      toast.push({ title: "Impossible d'ouvrir: ID manquant.", tone: 'error' })
      return
    }
    setViewingId(Number(id))
    setDetailsOpen(true)
  }

  const askDelete = (id: number) => setConfirmDelete({ open: true, id })
  const doDelete = () => {
    if (confirmDelete.id) mDelete.mutate(confirmDelete.id)
    setConfirmDelete({ open: false })
  }

  const viewClientHistory = (clientId: number, label?: string) => {
    setClientIdFilter(clientId)
    setClientLabelFilter(label || `Client #${clientId}`)
    setPage(1)
    setDetailsOpen(false)
    setViewingId(null)
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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <h2 className="text-xl font-semibold">Réservations</h2>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      Gérez les réservations (vol, hôtel, voiture, événement, forfait).
    </p>
  </div>

  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={refreshList}
      className="btn bg-gray-200 dark:bg-white/10 inline-flex items-center gap-2"
      title="Actualiser la liste"
    >
      <RefreshCw
        size={16}
        className={q.isFetching ? 'animate-spin' : ''}
      />
      Actualiser
    </button>

    <button className="btn-primary" onClick={openCreate} type="button">
      <Plus size={16} className="mr-2" /> Nouvelle réservation
    </button>
  </div>
</div>


      {/* Chip filtre historique client */}
      {clientIdFilter ? (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-panel px-3 py-1.5 text-sm shadow-soft">
            <span className="text-gray-600 dark:text-gray-300">Historique :</span>
            <span className="font-medium">{clientLabelFilter || `Client #${clientIdFilter}`}</span>
            <button type="button" className="btn px-2 bg-gray-200 dark:bg-white/10" onClick={clearClientHistoryFilter} title="Réinitialiser">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Filters */}
      <FiltersBar>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_220px] gap-3 w-full">
          <div>
            <label className="label">Recherche</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="input pl-9 pr-10"
                placeholder="Référence, client…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
              {search ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn px-2 bg-gray-200 dark:bg-white/10"
                  onClick={() => {
                    setSearch('')
                    setPage(1)
                  }}
                  title="Effacer"
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Tous</option>
              <option value="billet_avion">Billet d’avion</option>
              <option value="hotel">Hôtel</option>
              <option value="voiture">Voiture</option>
              <option value="evenement">Événement</option>
              <option value="forfait">Forfait</option>
            </select>
          </div>

          {/* ✅ Remplace statut par mois */}
          <div>
            <label className="label">Mois</label>
            <select
              className="input"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Tous</option>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FiltersBar>

      {/* Table */}
      {q.isLoading ? (
        <div>Chargement…</div>
      ) : q.isError ? (
        <div className="text-red-600">Erreur lors du chargement.</div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl shadow-soft bg-white dark:bg-panel border border-black/5 dark:border-white/10">
          <T className="w-full">
            <thead className="bg-gray-100/70 dark:bg-white/5">
              <tr>
                <Th>date</Th>
                <Th>Référence</Th>
                <Th className="hidden lg:table-cell">Type</Th>
                <Th>Client</Th>
                <Th className="hidden lg:table-cell">Statut</Th>
                <Th className="hidden lg:table-cell">Paiement</Th>
                <Th className="hidden lg:table-cell">Total</Th>
                <Th className="text-center">Actions</Th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <Td colSpan={8} className="text-center py-6 text-gray-500">
                    Aucune réservation trouvée
                  </Td>
                </tr>
              ) : (
                rows.map((r: any) => {
                  const clientName = [r?.client?.prenom, r?.client?.nom].filter(Boolean).join(' ') || r?.client?.nom || '—'
                  const canConfirm = r?.statut === 'en_attente' || r?.statut === 'brouillon'
                  const canCancel = r?.statut === 'en_attente' || r?.statut === 'brouillon'
                  const factureId = pickFactureIdFromReservation(r)

                  const actions = [
                    { label: 'Voir', icon: <Eye size={16} />, onClick: () => openDetails(r) },
                    { label: 'Modifier', icon: <Pencil size={16} />, onClick: () => openEdit(r) },
                    {
                      label: 'Devis (PDF)',
                      icon: <FileText size={16} />,
                      disabled: false,
                      onClick: () => downloadDevisPdf(r.id),
                    },
                    {
                      label: 'Télécharger facture',
                      icon: <Receipt size={16} />,
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
                          const msg = err?.response?.data?.message || 'Impossible de télécharger la facture.'
                          toast.push({ title: msg, tone: 'error' })
                        }
                      },
                    },
                    {
                      label: 'Confirmer',
                      icon: <CheckCircle2 size={16} />,
                      disabled: !canConfirm || isPendingMutation,
                      onClick: () => mConfirmer.mutate(r.id),
                    },
                    {
                      label: 'Annuler',
                      icon: <XCircle size={16} />,
                      disabled: !canCancel || isPendingMutation,
                      onClick: () => mAnnuler.mutate(r.id),
                    },
                    ...(isAdmin
                      ? [
                          {
                            label: 'Supprimer',
                            icon: <Trash2 size={16} />,
                            tone: 'danger' as const,
                            disabled: isPendingMutation,
                            onClick: () => askDelete(r.id),
                          },
                        ]
                      : []),
                  ]

                  return (
                    <tr
                      key={r.id}
                      className="border-t border-black/5 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                    >
                      <Td className="hidden lg:table-cell whitespace-nowrap">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                      </Td>

                      <Td className="font-medium whitespace-nowrap">{r.reference ?? `#${r.id}`}</Td>
                      <Td className="hidden lg:table-cell">{r.type_label ?? r.type ?? '—'}</Td>

                      <Td className="min-w-0">
                        <div className="truncate">{clientName}</div>

                        <div className="mt-1 text-xs text-gray-500 lg:hidden flex flex-wrap items-center gap-2">
                          <span className="capitalize">{r.type_label ?? r.type ?? '—'}</span>
                          <span>•</span>
                          <StatusBadge statut={r.statut} />
                          <span>•</span>
                          <PaymentBadge reservation={r} />
                          <span>•</span>
                          <span className="font-medium">{money(r.montant_total, 'XOF')}</span>
                        </div>
                      </Td>

                      <Td className="hidden lg:table-cell">
                        <StatusBadge statut={r.statut} />
                      </Td>

                      <Td className="hidden lg:table-cell">
                        <PaymentBadge reservation={r} />
                      </Td>

                      <Td className="hidden lg:table-cell">{money(r.montant_total, 'XOF')}</Td>

                      <Td className="text-center whitespace-nowrap">
                        <ActionsMenu items={actions} />
                      </Td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </T>
        </div>
      )}

      <Pagination page={paged.page} lastPage={paged.lastPage} total={paged.total} onPage={setPage} />

      {/* Details Modal */}
      <Modal
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false)
          setViewingId(null)
        }}
        title="Détails de la réservation"
        widthClass="max-w-[1200px]"
      >
        <div className={['h-[85vh] lg:h-[88vh]', 'flex flex-col', 'min-w-0'].join(' ')}>
          <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 px-4 pt-4 pb-3 bg-white dark:bg-panel border-b border-black/5 dark:border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {viewingReservation?.reference ? `Réservation ${viewingReservation.reference}` : 'Réservation'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {viewingReservation?.client ? `${viewingReservation.client?.prenom ?? ''} ${viewingReservation.client?.nom ?? ''}`.trim() : ''}
                </div>
              </div>

              <button
                type="button"
                className="btn px-3 bg-gray-200 dark:bg-white/10"
                onClick={() => {
                  setDetailsOpen(false)
                  setViewingId(null)
                }}
              >
                Fermer
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto pr-1">
            {viewingId ? (
              qDetails.isLoading ? (
                <div className="py-6 text-sm text-gray-500">Chargement des détails…</div>
              ) : qDetails.isError ? (
                <div className="py-6 text-sm text-red-600">Impossible de charger les détails.</div>
              ) : viewingReservation ? (
                <ReservationDetails reservation={viewingReservation} {...({ onViewClientHistory: viewClientHistory } as any)} />
              ) : (
                <div className="py-6 text-sm text-gray-500">Aucune donnée.</div>
              )
            ) : (
              <div className="py-6 text-sm text-gray-500">ID manquant.</div>
            )}
          </div>
        </div>
      </Modal>

      {/* Form Modal */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
          setPrefillCreate(null)
        }}
        title={editing ? 'Modifier réservation' : 'Nouvelle réservation'}
        widthClass="max-w-[1200px]"
      >
        <ReservationsForm
          defaultValues={(editing ?? (prefillCreate ?? undefined)) as any}
          onSubmit={(vals) => (editing ? mUpdate.mutate(vals) : mCreate.mutate(vals))}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          submitting={mCreate.isPending || mUpdate.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={confirmDelete.open}
        onCancel={() => setConfirmDelete({ open: false })}
        onConfirm={doDelete}
        title="Supprimer cette réservation ?"
        message="Cette action est irréversible."
      />
    </div>
  )
}
