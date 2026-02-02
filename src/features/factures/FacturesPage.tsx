// src/features/factures/FacturesPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { T, Th, Td } from '../../ui/Table'
import { Pagination } from '../../ui/Pagination'
import { FiltersBar } from '../../ui/FiltersBar'
import { Badge } from '../../ui/Badge'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { useToast } from '../../ui/Toasts'
import { ActionsMenu } from '../../ui/ActionsMenu'

import { FacturesForm } from './FacturesForm'
import { AddPaymentForm, type AddPaymentInput } from './AddPaymentForm'
import { CreateInvoiceForm, type CreateInvoiceInput } from './CreateInvoiceForm'

import { Plus, Search, Eye, Trash2, Download, Receipt, CreditCard, FileText } from 'lucide-react'

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
  const items = Array.isArray(input?.data)
    ? input.data
    : Array.isArray(input?.items)
    ? input.items
    : Array.isArray(input)
    ? input
    : []
  return {
    items,
    page: input?.current_page ?? input?.page ?? 1,
    lastPage: input?.last_page ?? input?.lastPage ?? 1,
    total: input?.total ?? items?.length ?? 0,
  }
}

const money = (n: any, devise = 'XOF') => `${Number(n || 0).toLocaleString()} ${devise}`

type FactureStatut = 'brouillon' | 'emis' | 'paye_partiel' | 'paye_totalement' | 'annule' | string
type Facture = any

const statutTone = (s?: FactureStatut) => {
  const v = String(s || '')
  if (v === 'paye_totalement') return 'green'
  if (v === 'annule') return 'red'
  if (v === 'brouillon') return 'gray'
  if (v === 'emis') return 'amber'
  if (v === 'paye_partiel') return 'amber'
  return 'gray'
}

const statutLabel = (s?: FactureStatut) => {
  const v = String(s || '')
  if (v === 'paye_totalement') return 'Payée'
  if (v === 'paye_partiel') return 'Payée partiellement'
  if (v === 'emis') return 'Émise'
  if (v === 'brouillon') return 'Brouillon'
  if (v === 'annule') return 'Annulée'
  return v || '—'
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

function safeDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString()
}

export default function FacturesPage() {
  const qc = useQueryClient()
  const toast = useToast()

  // Pagination fixée à 10
  const [page, setPage] = useState(1)
  const perPage = 10

  // filtres
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [statut, setStatut] = useState<string>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // modals
  const [openCreate, setOpenCreate] = useState(false)
  const [openDetails, setOpenDetails] = useState(false)
  const [viewingId, setViewingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id?: number }>({ open: false })

  // sub-modals in details
  const [openAddPayment, setOpenAddPayment] = useState(false)

  // -------------------- Queries --------------------
  const q = useQuery({
    queryKey: ['factures', { page, perPage, search: debouncedSearch, statut, from, to }] as const,
    queryFn: async () => {
      const { data } = await api.get('/factures', {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          statut: statut || undefined,
          date_from: from || undefined,
          date_to: to || undefined,
        },
      })
      return data
    },
    placeholderData: keepPreviousData,
  })

  const paged = useMemo(() => normalizePaged(q.data), [q.data])
  const rows: Facture[] = useMemo(() => paged.items ?? [], [paged.items])

  const qDetails = useQuery({
    queryKey: ['facture', viewingId] as const,
    enabled: openDetails && !!viewingId,
    queryFn: async () => {
      // ✅ Fallback: si /factures/:id n'existe pas
      try {
        const { data } = await api.get(`/factures/${viewingId}`)
        return data
      } catch {
        const { data } = await api.get(`/factures`, { params: { id: viewingId, per_page: 1, page: 1 } })
        return data
      }
    },
  })

  const facture = useMemo(() => {
    const d: any = qDetails.data
    if (!d) return null
    const data = d?.data ?? d

    // fallback pagination
    if (Array.isArray(data?.data) && data.data.length > 0) return data.data[0]
    if (Array.isArray(data?.items) && data.items.length > 0) return data.items[0]

    return data
  }, [qDetails.data])

  const totalFacture = Number(facture?.montant_total ?? facture?.montant_ttc ?? facture?.total ?? 0)
  const devise = facture?.devise || 'XOF'
  const paiements = Array.isArray(facture?.paiements) ? facture.paiements : []
  const totalPaye = paiements.reduce((acc: number, p: any) => acc + Number(p?.montant || 0), 0)
  const restant = Math.max(0, totalFacture - totalPaye)
  const pct = totalFacture > 0 ? Math.round((totalPaye / totalFacture) * 100) : 0

  const payBadge = useMemo(() => {
    if (totalPaye <= 0) return { label: 'Non payé', tone: 'red' as const }
    if (restant <= 0) return { label: 'Payé', tone: 'green' as const }
    return { label: 'Partiel', tone: 'amber' as const }
  }, [totalPaye, restant])

  // -------------------- Mutations --------------------
  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/factures/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factures'] })
      toast.push({ title: 'Facture supprimée', tone: 'success' })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la suppression.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  const mCreateStandalone = useMutation({
    mutationFn: (vals: any) => api.post('/factures', vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factures'] })
      setOpenCreate(false)
      toast.push({ title: 'Facture créée', tone: 'success' })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la création.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  const mCreateFromReservation = useMutation({
    mutationFn: async (vals: CreateInvoiceInput & { reservationId: number }) => {
      const date_facture = vals.date_facture || new Date().toISOString().slice(0, 10)
      const { data } = await api.post(`/reservations/${vals.reservationId}/factures`, {
        date_facture,
        montant_total: vals.montant_total ?? undefined,
      })
      return data?.data ?? data
    },
    onSuccess: (f: any) => {
      qc.invalidateQueries({ queryKey: ['factures'] })
      if (viewingId) qc.invalidateQueries({ queryKey: ['facture', viewingId] })
      toast.push({ title: 'Facture créée pour la réservation', tone: 'success' })
      if (f?.id) setViewingId(Number(f.id))
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Impossible de créer la facture.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  const mAddPayment = useMutation({
    mutationFn: async (vals: AddPaymentInput & { factureId: number }) => {
      const factureId = vals.factureId
      const payload = { ...vals } as any
      delete payload.factureId
      const { data } = await api.post(`/factures/${factureId}/paiements`, payload)
      return data?.data ?? data
    },
    onSuccess: () => {
      if (viewingId) qc.invalidateQueries({ queryKey: ['facture', viewingId] })
      qc.invalidateQueries({ queryKey: ['factures'] })
      setOpenAddPayment(false)
      toast.push({ title: 'Paiement ajouté', tone: 'success' })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Impossible d'ajouter le paiement."
      toast.push({ title: msg, tone: 'error' })
    },
  })

  // Téléchargement PDF robuste
  const downloadPdf = async (factureId: number, numero?: string) => {
    const filename = `${numero || `facture-${factureId}`}.pdf`.replace(/[^\w\-\.]+/g, '_')
    try {
      const res = await api.get(`/factures/${factureId}/pdf`, { responseType: 'blob' })
      downloadBlob(res.data, filename)
      toast.push({ title: 'PDF téléchargé', tone: 'success' })
    } catch (err: any) {
      const msg = err?.response?.data?.message || ''
      const isMissingPdf =
        String(msg).toLowerCase().includes('pdf introuvable') ||
        String(msg).toLowerCase().includes("générez d'abord") ||
        err?.response?.status === 422

      if (!isMissingPdf) {
        toast.push({ title: msg || 'Erreur téléchargement PDF.', tone: 'error' })
        return
      }

      try {
        const gen = await api.post(`/factures/${factureId}/pdf`, {}, { responseType: 'blob' })
        if (gen?.data instanceof Blob) {
          downloadBlob(gen.data, filename)
          toast.push({ title: 'PDF généré et téléchargé', tone: 'success' })
          return
        }
      } catch {}

      try {
        const res2 = await api.get(`/factures/${factureId}/pdf`, { responseType: 'blob' })
        downloadBlob(res2.data, filename)
        toast.push({ title: 'PDF généré et téléchargé', tone: 'success' })
      } catch (err2: any) {
        const msg2 = err2?.response?.data?.message || 'PDF toujours indisponible.'
        toast.push({ title: msg2, tone: 'error' })
      }
    }
  }

  // -------------------- UI actions --------------------
  const openFactureDetails = (f: any) => {
    const id = Number(f?.id)
    if (!id) {
      toast.push({ title: 'Impossible d’ouvrir: ID manquant.', tone: 'error' })
      return
    }
    setViewingId(id)
    setOpenDetails(true)
  }

  const askDelete = (id: number) => setConfirmDelete({ open: true, id })
  const doDelete = () => {
    if (confirmDelete.id) mDelete.mutate(confirmDelete.id)
    setConfirmDelete({ open: false })
  }

  const reservationInDetails = facture?.reservation || null
  const reservationId = Number(facture?.reservation_id || reservationInDetails?.id || 0)

  // -------------------- render --------------------
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Factures</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Suivi des factures, paiements, reste à payer et PDF.</p>
        </div>

        <button className="btn-primary" type="button" onClick={() => setOpenCreate(true)}>
          <Plus size={16} className="mr-2" />
          Nouvelle facture
        </button>
      </div>

      {/* Filters */}
      <FiltersBar>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_170px_170px] gap-3 w-full">
          <div>
            <label className="label">Recherche</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="input pl-9 pr-10"
                placeholder="N° facture, ref réservation, client…"
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
            <label className="label">Statut</label>
            <select
              className="input"
              value={statut}
              onChange={(e) => {
                setStatut(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Tous</option>
              <option value="brouillon">Brouillon</option>
              <option value="emis">Émise</option>
              <option value="paye_partiel">Payée partiellement</option>
              <option value="paye_totalement">Payée</option>
              <option value="annule">Annulée</option>
            </select>
          </div>

          <div>
            <label className="label">Du</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div>
            <label className="label">Au</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                setPage(1)
              }}
            />
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
                <Th>Numéro</Th>
                <Th className="hidden lg:table-cell">Réservation</Th>
                <Th>Client</Th>
                <Th>Statut</Th>
                <Th className="hidden lg:table-cell">Total</Th>
                <Th className="text-center">Actions</Th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <Td colSpan={6} className="text-center py-6 text-gray-500">
                    Aucune facture trouvée
                  </Td>
                </tr>
              ) : (
                rows.map((f: any) => {
                  const numero = f?.numero || `Facture #${f?.id}`
                  const clientName =
                    [f?.client?.prenom, f?.client?.nom].filter(Boolean).join(' ') ||
                    f?.client?.nom ||
                    [f?.reservation?.client?.prenom, f?.reservation?.client?.nom].filter(Boolean).join(' ') ||
                    f?.reservation?.client?.nom ||
                    '—'

                  const resRef = f?.reservation?.reference || (f?.reservation_id ? `#${f.reservation_id}` : '—')

                  const actions = [
                    { label: 'Voir', icon: <Eye size={16} />, onClick: () => openFactureDetails(f) },
                    {
                      label: 'Télécharger PDF',
                      icon: <Download size={16} />,
                      onClick: () => downloadPdf(Number(f.id), f?.numero),
                    },
                    { label: 'Supprimer', icon: <Trash2 size={16} />, tone: 'danger' as const, onClick: () => askDelete(Number(f.id)) },
                  ]

                  return (
                    <tr
                      key={f.id}
                      className="border-t border-black/5 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                    >
                      <Td className="font-medium whitespace-nowrap">{numero}</Td>
                      <Td className="hidden lg:table-cell whitespace-nowrap">{resRef}</Td>

                      <Td className="min-w-0">
                        <div className="truncate">{clientName}</div>
                        <div className="text-xs text-gray-500 lg:hidden">
                          {resRef} • {money(f?.montant_total ?? f?.montant_ttc ?? f?.total, f?.devise || 'XOF')}
                        </div>
                      </Td>

                      <Td>
                        <Badge tone={statutTone(f?.statut)}>{statutLabel(f?.statut)}</Badge>
                      </Td>

                      <Td className="hidden lg:table-cell whitespace-nowrap">
                        {money(f?.montant_total ?? f?.montant_ttc ?? f?.total, f?.devise || 'XOF')}
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

      {/* Pagination */}
      <Pagination page={paged.page} lastPage={paged.lastPage} total={paged.total} onPage={setPage} />

      {/* Create Modal */}
      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Nouvelle facture" widthClass="max-w-2xl">
        <FacturesForm
          defaultValues={{}}
          onSubmit={(vals: any) => mCreateStandalone.mutate(vals)}
          onCancel={() => setOpenCreate(false)}
          submitting={mCreateStandalone.isPending}
        />
      </Modal>

      {/* Details Modal (LARGE + scroll interne) */}
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
                    <Badge tone={statutTone(facture?.statut)}>{statutLabel(facture?.statut)}</Badge>
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
                    className="btn bg-gray-200 dark:bg-white/10"
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

                  {/* (Optionnel) Ajouter lignes/taxes/etc si ton backend les expose */}
                </div>

                {/* RIGHT */}
                <div className="space-y-4">
                  {/* Add Payment inline */}
                  {openAddPayment ? (
                    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
                      <div className="font-semibold">Ajouter un paiement</div>
                      <div className="mt-3">
                        <AddPaymentForm
                          onSubmit={(vals) => mAddPayment.mutate({ ...vals, factureId: Number(facture.id) })}
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
            </div>
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmDelete.open}
        onCancel={() => setConfirmDelete({ open: false })}
        onConfirm={doDelete}
        title="Supprimer cette facture ?"
        message="Cette action est irréversible."
      />
    </div>
  )
}
