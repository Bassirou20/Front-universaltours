import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import Modal from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { T, Th, Td } from '../../ui/Table'
import { Pagination } from '../../ui/Pagination'
import { FiltersBar } from '../../ui/FiltersBar'
import { useToast } from '../../ui/Toasts'
import { useAuth } from '../../store/auth'
import { Badge } from '../../ui/Badge'
import { ActionsMenu } from '../../ui/ActionsMenu'
import { Eye, Pencil, Trash2, Plus, Search, Wallet, Calendar, X } from 'lucide-react'
import PaiementsForm, { type PaiementInput, type FactureOption } from './PaiementsForm'
import PaiementDetails, { type PaiementModel } from './PaiementDetails'

type LaravelPage<T> = { data: T[]; current_page: number; last_page: number; total?: number }

type Facture = {
  id: number
  numero?: string | null
  statut?: string | null
  montant_total?: number | null
  total?: number | null
  created_at?: string | null
  paiements?: PaiementModel[]
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

async function fetchAllPaged<T>(path: string, params?: any): Promise<T[]> {
  const all: T[] = []
  let page = 1
  let last = 1

  for (let guard = 0; guard < 60; guard++) {
    const { data } = await api.get(path, { params: { ...params, page, per_page: 100 } })
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

const MODE_LABEL: Record<string, string> = {
  especes: 'Espèces',
  orange_money: 'Orange Money',
  wave: 'Wave',
  carte: 'Carte',
  virement: 'Virement',
  cheque: 'Chèque',
  free_money: 'Free Money',
}

const modeTone = (m?: string | null) => {
  const x = (m || '').toLowerCase()
  if (x.includes('orange')) return 'amber'
  if (x.includes('wave')) return 'blue'
  if (x.includes('virement')) return 'purple'
  if (x.includes('carte')) return 'green'
  if (x.includes('free')) return 'purple'
  return 'gray'
}

const statutTone = (s?: string | null) => {
  const v = (s || '').toLowerCase()
  if (v === 'recu' || v === 'reçu') return 'green'
  if (v === 'en_attente') return 'amber'
  if (v === 'annule') return 'gray'
  return 'gray'
}

async function fetchPaiementsSmart(): Promise<PaiementModel[]> {
  try {
    const res = await api.get('/paiements', { params: { page: 1, per_page: 100 } })
    const data = res.data
    if (Array.isArray(data)) return data as PaiementModel[]
    if (Array.isArray(data?.data)) {
      const all = await fetchAllPaged<PaiementModel>('/paiements')
      return all.length ? all : (data.data as PaiementModel[])
    }
  } catch {}

  const factures = await fetchAllPaged<Facture>('/factures')
  const flattened: PaiementModel[] = []
  for (const f of factures) {
    const pays = Array.isArray(f.paiements) ? f.paiements : []
    for (const p of pays) {
      flattened.push({
        ...p,
        facture_id: (p.facture_id ?? f.id) as any,
        facture:
          (p as any).facture ?? {
            id: f.id,
            numero: f.numero ?? null,
            total: (f.total ?? f.montant_total ?? null) as any,
            statut: f.statut ?? null,
          },
      } as any)
    }
  }
  return flattened
}

const money = (n: any, devise = 'XOF') => `${Number(n || 0).toLocaleString()} ${devise}`

const startOfMonthISO = () => {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

export default function PaiementsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = (user?.role ?? '').toLowerCase() === 'admin'

  const [page, setPage] = useState(1)
  const perPage = 10

  // filters
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [fMode, setFMode] = useState<string>('')
  const [fFactureId, setFFactureId] = useState<string>('')

  const [dateFrom, setDateFrom] = useState<string>(startOfMonthISO())
  const [dateTo, setDateTo] = useState<string>('')

  const [amountMin, setAmountMin] = useState<string>('')
  const [amountMax, setAmountMax] = useState<string>('')

  // modals
  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editing, setEditing] = useState<PaiementModel | null>(null)
  const [selected, setSelected] = useState<PaiementModel | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const qPaiements = useQuery({
    queryKey: ['paiements-all-smart'],
    queryFn: fetchPaiementsSmart,
    staleTime: 20_000,
  })

  const qFactures = useQuery({
    queryKey: ['factures-options'],
    queryFn: async () => {
      const factures = await fetchAllPaged<Facture>('/factures')
      return factures.map((f) => ({
        id: f.id,
        numero: f.numero ?? null,
        total: (f.total ?? f.montant_total ?? null) as any,
        statut: f.statut ?? null,
      })) as FactureOption[]
    },
    staleTime: 60_000,
  })

  const paiements = useMemo(() => qPaiements.data ?? [], [qPaiements.data])
  const factures = useMemo(() => qFactures.data ?? [], [qFactures.data])

  // ✅ payé = seulement "recu"
  const paidByFacture = useMemo(() => {
    const map = new Map<number, number>()
    for (const p of paiements) {
      const st = String((p as any).statut ?? '').toLowerCase()
      if (st && st !== 'recu' && st !== 'reçu') continue
      const fid = Number((p as any).facture_id)
      map.set(fid, (map.get(fid) || 0) + Number((p as any).montant || 0))
    }
    return map
  }, [paiements])

  const filtered = useMemo(() => {
    let list = [...paiements]

    const s = (debouncedSearch || '').trim().toLowerCase()
    if (s) {
      list = list.filter((p: any) => {
        const ref = String(p.reference ?? '').toLowerCase()
        const num = String(p.facture?.numero ?? '').toLowerCase()
        const mode = String(p.mode_paiement ?? '').toLowerCase()
        return ref.includes(s) || num.includes(s) || mode.includes(s) || String(p.id).includes(s)
      })
    }

    if (fMode) list = list.filter((p: any) => String(p.mode_paiement || '') === fMode)
    if (fFactureId) list = list.filter((p: any) => String(p.facture_id) === String(fFactureId))

    const dFrom = (dateFrom || '').trim()
    const dTo = (dateTo || '').trim()
    if (dFrom) {
      const tFrom = +new Date(`${dFrom}T00:00:00`)
      list = list.filter((p: any) => {
        const d = String(p.date_paiement || p.created_at || '').slice(0, 10)
        if (!d) return false
        return +new Date(`${d}T00:00:00`) >= tFrom
      })
    }
    if (dTo) {
      const tTo = +new Date(`${dTo}T23:59:59`)
      list = list.filter((p: any) => {
        const d = String(p.date_paiement || p.created_at || '').slice(0, 10)
        if (!d) return false
        return +new Date(`${d}T23:59:59`) <= tTo
      })
    }

    const min = amountMin ? Number(amountMin) : null
    const max = amountMax ? Number(amountMax) : null
    if (min != null && !Number.isNaN(min)) list = list.filter((p: any) => Number(p.montant || 0) >= min)
    if (max != null && !Number.isNaN(max)) list = list.filter((p: any) => Number(p.montant || 0) <= max)

    list.sort((a: any, b: any) => +new Date(b.date_paiement || b.created_at || 0) - +new Date(a.date_paiement || a.created_at || 0))
    return list
  }, [paiements, debouncedSearch, fMode, fFactureId, dateFrom, dateTo, amountMin, amountMax])

  const total = filtered.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), lastPage))
  }, [lastPage])

  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page, perPage])

  const totalFilteredAmount = useMemo(() => filtered.reduce((sum: number, p: any) => sum + Number(p.montant || 0), 0), [filtered])

  const thisMonthTotal = useMemo(() => {
    const from = startOfMonthISO()
    const tFrom = +new Date(`${from}T00:00:00`)
    return paiements.reduce((acc: number, p: any) => {
      const d = String(p.date_paiement || p.created_at || '').slice(0, 10)
      if (!d) return acc
      const t = +new Date(`${d}T00:00:00`)
      if (t >= tFrom) return acc + Number(p.montant || 0)
      return acc
    }, 0)
  }, [paiements])

  const mCreate = useMutation({
    mutationFn: (vals: PaiementInput) => api.post(`/factures/${vals.facture_id}/paiements`, vals),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['paiements-all-smart'] })
      await qc.invalidateQueries({ queryKey: ['factures-options'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Paiement enregistré', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur création paiement', tone: 'error' }),
  })

  const mUpdate = useMutation({
    mutationFn: (vals: PaiementInput) => api.put(`/paiements/${editing?.id}`, vals),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['paiements-all-smart'] })
      await qc.invalidateQueries({ queryKey: ['factures-options'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Paiement mis à jour', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Update non disponible sur l’API', tone: 'error' }),
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/paiements/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['paiements-all-smart'] })
      toast.push({ title: 'Paiement supprimé', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Delete non disponible sur l’API', tone: 'error' }),
  })

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (p: PaiementModel) => {
    setEditing(p)
    setFormOpen(true)
  }
  const openDetails = (p: PaiementModel) => {
    setSelected(p)
    setDetailsOpen(true)
  }

  const toDefaults = (p?: PaiementModel): Partial<PaiementInput> | undefined => {
    if (!p) return undefined
    return {
      facture_id: (p as any).facture_id,
      date_paiement: String((p as any).date_paiement || (p as any).created_at || '').slice(0, 10),
      montant: Number((p as any).montant || 0),
      mode_paiement: String((p as any).mode_paiement || 'especes'),
      reference: (p as any).reference ?? '',
      statut: (p as any).statut ?? 'recu',
      notes: (p as any).notes ?? '',
    }
  }

  const clearFilters = () => {
    setSearch('')
    setFMode('')
    setFFactureId('')
    setDateFrom(startOfMonthISO())
    setDateTo('')
    setAmountMin('')
    setAmountMax('')
    setPage(1)
  }

  const hasFilters =
    Boolean(debouncedSearch) || Boolean(fMode) || Boolean(fFactureId) || Boolean(dateFrom) || Boolean(dateTo) || Boolean(amountMin) || Boolean(amountMax)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 flex items-center justify-center">
              <Wallet size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold truncate">Paiements</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {total} paiement{total > 1 ? 's' : ''} • Total filtré : {money(totalFilteredAmount)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="gray">{paiements.length} au total</Badge>
            <Badge tone="blue">Ce mois: {money(thisMonthTotal)}</Badge>
            {hasFilters ? <Badge tone="amber">Filtres actifs</Badge> : null}
          </div>
        </div>

        <button className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
          <Plus size={16} /> Nouveau paiement
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
          <div className="text-xs text-gray-500">Total (tous paiements)</div>
          <div className="text-xl font-bold mt-1">{money(paiements.reduce((a: number, p: any) => a + Number(p.montant || 0), 0))}</div>
        </div>
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
          <div className="text-xs text-gray-500">Total (ce mois)</div>
          <div className="text-xl font-bold mt-1">{money(thisMonthTotal)}</div>
        </div>
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
          <div className="text-xs text-gray-500">Nb paiements (filtrés)</div>
          <div className="text-xl font-bold mt-1">{total}</div>
        </div>
      </div>

      {/* Filters */}
      <FiltersBar>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
          <div className="md:col-span-2">
            <label className="label">Recherche</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
              <input
                className="input pl-9 pr-10"
                placeholder="Référence, facture, mode…"
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
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <label className="label">Mode</label>
            <select className="input" value={fMode} onChange={(e) => { setFMode(e.target.value); setPage(1) }}>
              <option value="">Tous</option>
              {Object.keys(MODE_LABEL).map((k) => (
                <option key={k} value={k}>
                  {MODE_LABEL[k]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Facture</label>
            <select className="input" value={fFactureId} onChange={(e) => { setFFactureId(e.target.value); setPage(1) }}>
              <option value="">Toutes</option>
              {factures.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.numero ? f.numero : `Facture #${f.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Date début</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
              <input type="date" className="input pl-9" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
            </div>
          </div>

          <div>
            <label className="label">Date fin</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
              <input type="date" className="input pl-9" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
            </div>
          </div>

          <div>
            <label className="label">Montant min</label>
            <input type="number" className="input" placeholder="0" value={amountMin} onChange={(e) => { setAmountMin(e.target.value); setPage(1) }} />
          </div>

          <div>
            <label className="label">Montant max</label>
            <input type="number" className="input" placeholder="0" value={amountMax} onChange={(e) => { setAmountMax(e.target.value); setPage(1) }} />
          </div>

          <div className="flex items-end">
            <button type="button" className="btn bg-gray-200 dark:bg-white/10 w-full" onClick={clearFilters}>
              Réinitialiser
            </button>
          </div>
        </div>
      </FiltersBar>

      {/* Table */}
      {qPaiements.isLoading ? (
        <p>Chargement…</p>
      ) : qPaiements.isError ? (
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
          <div className="text-red-600 font-semibold">Erreur chargement paiements</div>
          <div className="text-sm text-gray-500 mt-1">
            Vérifie que l’API renvoie bien les paiements (ou factures + paiements).
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden bg-white dark:bg-panel shadow-soft">
          <T>
            <thead className="bg-gray-100/70 dark:bg-white/5">
              <tr>
                <Th>Date</Th>
                <Th>Facture</Th>
                <Th>Montant</Th>
                <Th className="hidden lg:table-cell">Mode</Th>
                <Th className="hidden lg:table-cell">Statut</Th>
                <Th className="hidden lg:table-cell">Référence</Th>
                <Th className="w-[64px]"></Th>
              </tr>
            </thead>

            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td className="p-8 text-gray-500 text-center" colSpan={7}>
                    <div className="flex flex-col items-center gap-2">
                      <div className="font-semibold">Aucun paiement</div>
                      <div className="text-sm">Ajuste les filtres ou crée un nouveau paiement.</div>
                      <button className="btn-primary mt-2" onClick={openCreate} type="button">
                        <Plus size={16} className="mr-2" /> Nouveau paiement
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pageItems.map((p: any) => {
                  const factureLabel = p.facture?.numero ?? `Facture #${p.facture_id}`
                  const st = String(p.statut ?? '').toLowerCase() || 'recu'

                  const actions = [
                    { label: 'Voir', icon: <Eye size={16} />, onClick: () => openDetails(p) },
                    ...(isAdmin
                      ? [
                          { label: 'Modifier', icon: <Pencil size={16} />, onClick: () => openEdit(p) },
                          { label: 'Supprimer', icon: <Trash2 size={16} />, tone: 'danger' as const, onClick: () => setConfirmId(p.id) },
                        ]
                      : []),
                  ]

                  return (
                    <tr key={p.id} className="border-t border-black/5 dark:border-white/10">
                      <Td>
                        <div className="font-medium">{String(p.date_paiement || p.created_at || '').slice(0, 10) || '—'}</div>
                        <div className="text-xs text-gray-500 lg:hidden mt-1 flex flex-wrap gap-2">
                          <Badge tone={modeTone(p.mode_paiement) as any}>{MODE_LABEL[p.mode_paiement || ''] || p.mode_paiement || '—'}</Badge>
                          <Badge tone={statutTone(st) as any}>{st}</Badge>
                          {p.reference ? <Badge tone="gray">{p.reference}</Badge> : null}
                        </div>
                      </Td>

                      <Td>
                        <Badge tone="blue">{factureLabel}</Badge>
                      </Td>

                      <Td className="font-semibold">
                        {Number(p.montant || 0).toLocaleString()} <span className="text-xs text-gray-500">XOF</span>
                      </Td>

                      <Td className="hidden lg:table-cell">
                        <Badge tone={modeTone(p.mode_paiement) as any}>{MODE_LABEL[p.mode_paiement || ''] || p.mode_paiement || '—'}</Badge>
                      </Td>

                      <Td className="hidden lg:table-cell">
                        <Badge tone={statutTone(st) as any}>{st}</Badge>
                      </Td>

                      <Td className="hidden lg:table-cell">
                        {p.reference ? <span className="text-sm">{p.reference}</span> : <span className="text-gray-400">—</span>}
                      </Td>

                      <Td>
                        <div className="flex justify-end">
                          <ActionsMenu items={actions} />
                        </div>
                      </Td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </T>
        </div>
      )}

      <Pagination page={page} lastPage={lastPage} total={total} onPage={setPage} />

      {/* Details */}
      <Modal
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false)
          setSelected(null)
        }}
        title="Détails paiement"
        widthClass="max-w-3xl"
      >
        {selected ? <PaiementDetails paiement={selected} /> : null}
      </Modal>

      {/* Form */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Modifier paiement' : 'Nouveau paiement'}
        widthClass="max-w-3xl"
      >
        <PaiementsForm
          factures={factures}
          paiements={paiements}
          defaultValues={toDefaults(editing ?? undefined)}
          onSubmit={(vals) => (editing ? mUpdate.mutate(vals) : mCreate.mutate(vals))}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          submitting={mCreate.isPending || mUpdate.isPending}
        />
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        open={confirmId !== null}
        title="Supprimer ce paiement ?"
        message="Cette action est irréversible."
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId != null) mDelete.mutate(confirmId)
          setConfirmId(null)
        }}
      />
    </div>
  )
}
