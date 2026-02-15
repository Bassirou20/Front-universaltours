// src/features/factures/FacturesPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { FiltersBar } from '../../ui/FiltersBar'
import { Pagination } from '../../ui/Pagination'
import { T, Th, Td } from '../../ui/Table'
import { useToast } from '../../ui/Toasts'
import { Badge } from '../../ui/Badge'
import { ActionsMenu } from '../../ui/ActionsMenu'
import { Receipt, Search, Plus, Eye, Pencil, Trash2, FileText, CreditCard } from 'lucide-react'

import { FacturesForm, type FactureInput } from './FacturesForm'
import { AddPaymentForm, type AddPaymentInput } from './AddPaymentForm'
import { CreateInvoiceForm, type CreateInvoiceInput } from './CreateInvoiceForm'

type LaravelPage<T> = {
  data: T[]
  current_page: number
  last_page: number
  total?: number
}

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

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ')
}

const money = (n: any, devise = 'XOF') => `${Number(n || 0).toLocaleString()} ${devise}`

function safeDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString()
}

function safeDateTime(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleString()
}

function normalizePaged<T>(input: any): { items: T[]; page: number; lastPage: number; total: number } {
  const items = Array.isArray(input?.data) ? input.data : Array.isArray(input?.items) ? input.items : []
  return {
    items,
    page: Number(input?.current_page ?? input?.page ?? 1),
    lastPage: Number(input?.last_page ?? input?.lastPage ?? 1),
    total: Number(input?.total ?? 0),
  }
}

function statutLabel(s?: string | null) {
  const x = String(s || '').toLowerCase()
  if (x === 'emis') return 'Émise'
  if (x === 'payee' || x === 'payée') return 'Payée'
  if (x === 'impayee' || x === 'impayée') return 'Impayée'
  if (x === 'partielle' || x === 'paye_partiellement' || x === 'payee_partiellement') return 'Partielle'
  if (x === 'paye_totalement' || x === 'payee_totalement') return 'Payée (total)'
  if (x === 'annule' || x === 'annulée' || x === 'annulee') return 'Annulée'
  return s || '—'
}

function statutTone(s?: string | null) {
  const x = String(s || '').toLowerCase()
  if (x.includes('annul')) return 'red'
  if (x.includes('payee') || x.includes('paye_totalement')) return 'green'
  if (x.includes('partiel')) return 'amber'
  if (x.includes('impay')) return 'red'
  if (x === 'emis') return 'blue'
  return 'gray'
}

function paymentSummary(f: Facture) {
  const total = Number(f?.total ?? f?.montant_total ?? 0) || 0

  const raw = f?.paiements
  const arr: Paiement[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as any)?.data)
    ? ((raw as any).data as Paiement[])
    : Array.isArray((raw as any)?.items)
    ? ((raw as any).items as Paiement[])
    : []

  const paid = arr.reduce((sum, p) => {
    const st = String(p?.statut ?? '').toLowerCase()
    const m = Number(p?.montant ?? 0) || 0
    // s'il n'y a pas de statut, on considère reçu
    if (!p?.statut) return sum + m
    if (st === 'recu' || st === 'reçu') return sum + m
    return sum
  }, 0)

  const remaining = Math.max(0, total - paid)
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((paid / total) * 100))) : 0

  const label = paid <= 0 ? 'Non payé' : total > 0 && paid + 0.00001 >= total ? 'Payé' : 'Partiel'
  const tone: 'gray' | 'amber' | 'green' = paid <= 0 ? 'gray' : total > 0 && paid + 0.00001 >= total ? 'green' : 'amber'

  return { total, paid, remaining, pct, label, tone, paiements: arr }
}

async function fetchAllPaged<T>(path: string, params?: any): Promise<T[]> {
  const all: T[] = []
  let page = 1
  let last = 1

  for (let guard = 0; guard < 80; guard++) {
    const { data } = await api.get(path, { params: { ...params, page, per_page: 100 } })

    // certains endpoints renvoient un array direct
    if (Array.isArray(data)) return data as T[]

    const lp = data as LaravelPage<T>
    const items = Array.isArray(lp?.data) ? lp.data : []
    all.push(...items)

    last = Number(lp?.last_page ?? 1)
    page = Number(lp?.current_page ?? page) + 1
    if (page > last) break
  }

  return all
}

export default function FacturesPage() {
  const qc = useQueryClient()
  const toast = useToast()

  const [page, setPage] = useState(1)
  const perPage = 10

  // filters
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [fStatut, setFStatut] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // modals
  const [openCreate, setOpenCreate] = useState(false)
  const [openDetails, setOpenDetails] = useState(false)
  const [viewingId, setViewingId] = useState<number | null>(null)
  const [openAddPayment, setOpenAddPayment] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  // ------------- Query list -------------
  const qList = useQuery({
    queryKey: ['factures', { page, perPage, search: debouncedSearch, statut: fStatut, dateFrom, dateTo }] as const,
    queryFn: async () => {
      const { data } = await api.get('/factures', {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          statut: fStatut || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      })
      return data
    },
    placeholderData: keepPreviousData,
  })

  const paged = useMemo(() => normalizePaged<Facture>(qList.data), [qList.data])
  const rows: Facture[] = useMemo(() => paged.items ?? [], [paged.items])

  // ------------- Details query -------------
  const qDetails = useQuery({
    queryKey: ['factures', 'details', viewingId],
    queryFn: async () => {
      if (!viewingId) return null
      const { data } = await api.get(`/factures/${viewingId}`)
      // support {data:{...}} ou {...}
      return (data?.data ?? data) as Facture
    },
    enabled: !!viewingId && openDetails,
    staleTime: 10_000,
  })

  const facture = qDetails.data ?? null
  const devise = String(facture?.devise || 'XOF')

  const pay = useMemo(() => (facture ? paymentSummary(facture) : null), [facture])
  const totalFacture = pay?.total ?? 0
  const totalPaye = pay?.paid ?? 0
  const restant = pay?.remaining ?? 0
  const pct = pay?.pct ?? 0
  const payBadge = pay ? { label: pay.label, tone: pay.tone } : { label: '—', tone: 'gray' as const }
  const paiements = pay?.paiements ?? []

  const reservationId = Number(facture?.reservation_id || facture?.reservation?.id || 0) || null

  // ------------- Mutations -------------
  const mCreateStandalone = useMutation({
    mutationFn: async (vals: FactureInput) => {
      const { data } = await api.post('/factures', vals)
      return data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['factures'] })
      setOpenCreate(false)
      toast.push({ title: 'Facture créée', tone: 'success' })
    },
    onError: (e: any) =>
      toast.push({ title: e?.response?.data?.message || 'Erreur création facture', tone: 'error' }),
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/factures/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['factures'] })
      toast.push({ title: 'Facture supprimée', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur suppression', tone: 'error' }),
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
      toast.push({ title: 'Paiement enregistré', tone: 'success' })
      setOpenAddPayment(false)
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur paiement', tone: 'error' }),
  })

  const mCreateFromReservation = useMutation({
    mutationFn: async ({ reservationId }: { reservationId: number }) => {
      // ton backend: POST /reservations/:id/factures (assure + crée si manquante)
      const date_facture = new Date().toISOString().slice(0, 10)
      const { data } = await api.post(`/reservations/${reservationId}/factures`, { date_facture })
      return data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['factures'] })
      await qc.invalidateQueries({ queryKey: ['factures', 'details', viewingId] })
      toast.push({ title: 'Facture assurée (réservation)', tone: 'success' })
    },
    onError: (e: any) =>
      toast.push({ title: e?.response?.data?.message || 'Impossible d’assurer la facture', tone: 'error' }),
  })

  const downloadPdf = async (factureId: number, numero?: string | null) => {
    try {
      const filename = `${numero || `facture-${factureId}`}.pdf`.replace(/[^\w\-\.]+/g, '_')
      const res = await api.get(`/factures/${factureId}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.push({ title: 'PDF téléchargé', tone: 'success' })
    } catch (e: any) {
      toast.push({ title: e?.response?.data?.message || 'PDF indisponible', tone: 'error' })
    }
  }

  const total = Number(paged.total || 0)

  // ------------- UI helpers -------------
  const openDetailsById = (id: number) => {
    setViewingId(id)
    setOpenDetails(true)
    setOpenAddPayment(false)
  }

  const clearFilters = () => {
    setSearch('')
    setFStatut('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 flex items-center justify-center">
              <Receipt size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold truncate">Factures</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                Suivi des factures, paiements et statuts.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="gray">
              {total} facture{total > 1 ? 's' : ''}
            </Badge>
            {debouncedSearch ? <Badge tone="blue">Filtre: “{debouncedSearch}”</Badge> : null}
            {fStatut ? <Badge tone={statutTone(fStatut) as any}>Statut: {statutLabel(fStatut)}</Badge> : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={clearFilters}>
            Réinitialiser
          </button>

          <button type="button" className="btn-primary" onClick={() => setOpenCreate(true)}>
            <Plus size={16} className="mr-2" /> Nouvelle facture
          </button>
        </div>
      </div>

      {/* Filters */}
      <FiltersBar>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_180px_180px_140px] gap-3 w-full">
          <div>
            <label className="label">Recherche</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
              <input
                className="input pl-9"
                placeholder="Numéro, statut, réservation…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>

          <div>
            <label className="label">Statut</label>
            <select
              className="input"
              value={fStatut}
              onChange={(e) => {
                setFStatut(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Tous</option>
              <option value="emis">Émise</option>
              <option value="impayee">Impayée</option>
              <option value="partielle">Partielle</option>
              <option value="payee">Payée</option>
              <option value="annule">Annulée</option>
            </select>
          </div>

          <div>
            <label className="label">Date début</label>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div>
            <label className="label">Date fin</label>
            <input
              type="date"
              className="input"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              className="btn bg-gray-200 dark:bg-white/10 w-full"
              onClick={() => {
                setSearch('')
                setPage(1)
              }}
            >
              Effacer
            </button>
          </div>
        </div>
      </FiltersBar>

      {/* Table */}
      {qList.isLoading ? (
        <div className="py-6 text-sm text-gray-500">Chargement…</div>
      ) : qList.isError ? (
        <div className="py-6 text-sm text-red-600">Impossible de charger les factures.</div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl shadow-soft bg-white dark:bg-panel border border-black/5 dark:border-white/10">
          <T className="w-full">
            <thead className="bg-gray-100/70 dark:bg-white/5">
              <tr>
                <Th>Facture</Th>
                <Th className="hidden md:table-cell">Date</Th>
                <Th>Total</Th>
                <Th>Statut</Th>
                <Th className="hidden lg:table-cell">Paiement</Th>
                <Th className="text-center">Actions</Th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <Td colSpan={6} className="text-center py-10">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <div className="h-12 w-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] flex items-center justify-center">
                        <Receipt size={20} />
                      </div>
                      <div className="font-medium">Aucune facture trouvée</div>
                      <div className="text-sm">Change les filtres ou crée une facture.</div>
                      <button type="button" className="btn-primary mt-2" onClick={() => setOpenCreate(true)}>
                        <Plus size={16} className="mr-2" /> Créer une facture
                      </button>
                    </div>
                  </Td>
                </tr>
              ) : (
                rows.map((f) => {
                  const p = paymentSummary(f)
                  const actions = [
                    { label: 'Voir', icon: <Eye size={16} />, onClick: () => openDetailsById(Number(f.id)) },
                    {
                      label: 'PDF',
                      icon: <FileText size={16} />,
                      onClick: () => downloadPdf(Number(f.id), f.numero),
                    },
                    {
                      label: 'Supprimer',
                      icon: <Trash2 size={16} />,
                      tone: 'danger' as const,
                      onClick: () => setConfirmDeleteId(Number(f.id)),
                      disabled: mDelete.isPending,
                    },
                  ]

                  return (
                    <tr
                      key={f.id}
                      className="border-t border-black/5 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                    >
                      <Td className="min-w-0">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{f.numero || `Facture #${f.id}`}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {f.reservation?.reference ? `Réservation: ${f.reservation.reference}` : f.reservation_id ? `Réservation #${f.reservation_id}` : '—'}
                          </div>

                          <div className="mt-1 text-xs text-gray-500 md:hidden">
                            {f.date_facture || f.created_at ? safeDate(f.date_facture || f.created_at) : '—'}
                          </div>
                        </div>
                      </Td>

                      <Td className="hidden md:table-cell">
                        <div className="text-sm">{safeDate(f.date_facture || f.created_at)}</div>
                        <div className="text-xs text-gray-500">Créée {safeDateTime(f.created_at)}</div>
                      </Td>

                      <Td>
                        <div className="font-semibold">{money(p.total, String(f.devise || 'XOF'))}</div>
                        <div className="text-xs text-gray-500">
                          Payé: {money(p.paid, String(f.devise || 'XOF'))}
                        </div>
                      </Td>

                      <Td>
                        <Badge tone={statutTone(f.statut) as any}>{statutLabel(f.statut)}</Badge>
                      </Td>

                      <Td className="hidden lg:table-cell">
                        <Badge tone={p.tone as any}>
                          {p.label} • {p.pct}%
                        </Badge>
                      </Td>

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

      {/* Create invoice (standalone) */}
      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Nouvelle facture"
        widthClass="max-w-3xl"
      >
        <FacturesForm
          defaultValues={undefined}
          onSubmit={(vals: FactureInput) => mCreateStandalone.mutate(vals)}
          onCancel={() => setOpenCreate(false)}
          submitting={mCreateStandalone.isPending}
        />
      </Modal>

      {/* Details */}
      <Modal
        open={openDetails}
        onClose={() => {
          setOpenDetails(false)
          setViewingId(null)
          setOpenAddPayment(false)
        }}
        title="Détails de la facture"
        widthClass="max-w-6xl"
      >
        <div className="max-h-[78vh] overflow-y-auto pr-1">
          {!viewingId ? (
            <div className="py-6 text-sm text-gray-500">ID manquant.</div>
          ) : qDetails.isLoading ? (
            <div className="py-6 text-sm text-gray-500">Chargement…</div>
          ) : qDetails.isError ? (
            <div className="py-6 text-sm text-red-600">Impossible de charger les détails.</div>
          ) : !facture ? (
            <div className="py-6 text-sm text-gray-500">Aucune donnée.</div>
          ) : (
            <div className="space-y-4">
              {/* Header summary */}
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <Receipt size={18} />
                    <span>{facture?.numero || `Facture #${facture?.id}`}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone={payBadge.tone}>{payBadge.label}</Badge>
                    <Badge tone={statutTone(facture?.statut) as any}>{statutLabel(facture?.statut)}</Badge>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                    <div className="font-semibold">{money(totalFacture, devise)}</div>
                  </div>
                  <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Payé</div>
                    <div className="font-semibold">{money(totalPaye, devise)}</div>
                  </div>
                  <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Reste</div>
                    <div className="font-semibold">{money(restant, devise)}</div>
                  </div>
                  <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400">% payé</div>
                    <div className="font-semibold">{pct}%</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn bg-gray-200 dark:bg-white/10"
                    onClick={() => downloadPdf(Number(facture.id), facture?.numero)}
                  >
                    <FileText size={16} className="mr-2" />
                    Télécharger PDF
                  </button>

                  <button
                    type="button"
                    className={cx('btn bg-gray-200 dark:bg-white/10')}
                    onClick={() => setOpenAddPayment((v) => !v)}
                  >
                    <CreditCard size={16} className="mr-2" />
                    Ajouter un paiement
                  </button>

                  {reservationId ? (
                    <button
                      type="button"
                      className="btn bg-gray-200 dark:bg-white/10"
                      onClick={() => mCreateFromReservation.mutate({ reservationId })}
                      disabled={mCreateFromReservation.isPending}
                      title="Créer/assurer une facture pour la réservation"
                    >
                      <Receipt size={16} className="mr-2" />
                      Assurer facture (réservation)
                    </button>
                  ) : null}
                </div>
              </div>

              {/* 2 colonnes : Infos à gauche / Paiements à droite */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
                {/* LEFT */}
                <div className="space-y-4">
                  {facture?.reservation ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
                        <div className="font-semibold">Réservation</div>
                        <div className="mt-2 text-sm space-y-1">
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600 dark:text-gray-400">Référence</span>
                            <span className="font-medium">
                              {facture.reservation?.reference || `#${facture.reservation?.id}`}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600 dark:text-gray-400">Type</span>
                            <span className="font-medium">
                              {facture.reservation?.type_label || facture.reservation?.type || '—'}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600 dark:text-gray-400">Statut</span>
                            <span className="font-medium">{facture.reservation?.statut || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
                        <div className="font-semibold">Client</div>
                        <div className="mt-2 text-sm space-y-1">
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600 dark:text-gray-400">Nom</span>
                            <span className="font-medium">
                              {[facture.reservation?.client?.prenom, facture.reservation?.client?.nom]
                                .filter(Boolean)
                                .join(' ') ||
                                facture.reservation?.client?.nom ||
                                '—'}
                            </span>
                          </div>
                          {facture.reservation?.client?.email ? (
                            <div className="flex justify-between gap-3">
                              <span className="text-gray-600 dark:text-gray-400">Email</span>
                              <span className="font-medium">{facture.reservation.client.email}</span>
                            </div>
                          ) : null}
                          {facture.reservation?.client?.telephone ? (
                            <div className="flex justify-between gap-3">
                              <span className="text-gray-600 dark:text-gray-400">Téléphone</span>
                              <span className="font-medium">{facture.reservation.client.telephone}</span>
                            </div>
                          ) : null}
                          {facture.reservation?.client?.adresse ? (
                            <div className="flex justify-between gap-3">
                              <span className="text-gray-600 dark:text-gray-400">Adresse</span>
                              <span className="font-medium">{facture.reservation.client.adresse}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* RIGHT */}
                <div className="space-y-4">
                  {/* Add Payment inline */}
                  {openAddPayment ? (
                    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
                      <div className="font-semibold">Ajouter un paiement</div>
                      <div className="mt-3">
                        <AddPaymentForm
                          onSubmit={(vals: AddPaymentInput) =>
                            mAddPayment.mutate({ ...vals, factureId: Number(facture.id) })
                          }
                          onCancel={() => setOpenAddPayment(false)}
                          submitting={mAddPayment.isPending}
                          defaultValues={{}}
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* Payments list (scrollable) */}
                  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">Paiements</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {paiements.length} entrée{paiements.length > 1 ? 's' : ''}
                      </div>
                    </div>

                    {paiements.length === 0 ? (
                      <div className="mt-2 text-sm text-gray-500">Aucun paiement enregistré.</div>
                    ) : (
                      <div className="mt-3 space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                        {paiements
                          .slice()
                          .sort(
                            (a: any, b: any) =>
                              +new Date(b?.date_paiement || b?.created_at || 0) -
                              +new Date(a?.date_paiement || a?.created_at || 0)
                          )
                          .map((p: any) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] px-3 py-2 text-sm"
                            >
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {p.mode_paiement ?? '—'} {p.reference ? `(${p.reference})` : ''}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {safeDate(p.date_paiement || p.created_at)} {p.statut ? `• ${String(p.statut)}` : ''}
                                </div>
                              </div>
                              <div className="font-semibold whitespace-nowrap">{money(p.montant, devise)}</div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* (Optionnel) section technique */}
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
                <div className="font-semibold">Infos</div>
                <div className="mt-2 text-sm space-y-1">
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-600 dark:text-gray-400">ID</span>
                    <span className="font-medium">{facture.id}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-600 dark:text-gray-400">Date facture</span>
                    <span className="font-medium">{safeDate(facture.date_facture || facture.created_at)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-600 dark:text-gray-400">Échéance</span>
                    <span className="font-medium">{facture.due_date ? safeDate(facture.due_date) : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId != null) mDelete.mutate(confirmDeleteId)
          setConfirmDeleteId(null)
        }}
        title="Supprimer cette facture ?"
        message="Cette action est irréversible."
      />
    </div>
  )
}
