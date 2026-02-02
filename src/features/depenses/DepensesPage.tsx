import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { T, Th, Td } from '../../ui/Table'
import { Pagination } from '../../ui/Pagination'
import { FiltersBar } from '../../ui/FiltersBar'
import { useToast } from '../../ui/Toasts'
import { Badge } from '../../ui/Badge'
import { ActionsMenu } from '../../ui/ActionsMenu'
import { Eye, Pencil, Trash2, Plus, Search, Receipt } from 'lucide-react'
import DepensesForm, { type DepenseInput } from './DepensesForm'
import DepenseDetails, { type DepenseModel } from './DepenseDetails'

type LaravelPage<T> = {
  data: T[]
  current_page: number
  last_page: number
  total?: number
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const catLabel: Record<string, string> = {
  billet_externe: 'Billet (autre agence)',
  hotel_externe: 'Hôtel (externe)',
  transport: 'Transport',
  bureau: 'Bureau',
  marketing: 'Marketing',
  salaires: 'Salaires',
  autre: 'Autre',
}

const catTone = (c?: string | null) => {
  const x = (c || '').toLowerCase()
  if (x.includes('billet')) return 'amber'
  if (x.includes('hotel')) return 'purple'
  if (x.includes('transport')) return 'blue'
  if (x.includes('marketing')) return 'green'
  return 'gray'
}

export default function DepensesPage() {
  const qc = useQueryClient()
  const toast = useToast()

  const [page, setPage] = useState(1)
  const [perPage] = useState(10)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const [fCat, setFCat] = useState('')
  const [fStatut, setFStatut] = useState('')
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editing, setEditing] = useState<DepenseModel | null>(null)
  const [selected, setSelected] = useState<DepenseModel | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const qDepenses = useQuery({
    queryKey: ['depenses-all'],
    queryFn: async () => {
      const { data } = await api.get('/depenses', { params: { page: 1, per_page: 200 } })
      if (Array.isArray(data)) return data as DepenseModel[]
      return (data as LaravelPage<DepenseModel>)?.data ?? []
    },
    staleTime: 20_000,
  })

  const depenses = useMemo(() => qDepenses.data ?? [], [qDepenses.data])

  const filtered = useMemo(() => {
    let list = [...depenses]

    const s = (debouncedSearch || '').trim().toLowerCase()
    if (s) {
      list = list.filter((d) => {
        const lib = (d.libelle ?? '').toLowerCase()
        const frn = (d.fournisseur_nom ?? '').toLowerCase()
        const ref = (d.reference ?? '').toLowerCase()
        return lib.includes(s) || frn.includes(s) || ref.includes(s) || String(d.id).includes(s)
      })
    }

    if (fCat) list = list.filter((d) => (d.categorie || '') === fCat)
    if (fStatut) list = list.filter((d) => (d.statut || '') === fStatut)

    if (fFrom) list = list.filter((d) => (d.date_depense || '') >= fFrom)
    if (fTo) list = list.filter((d) => (d.date_depense || '') <= fTo)

    list.sort((a, b) => +new Date(b.date_depense) - +new Date(a.date_depense))
    return list
  }, [depenses, debouncedSearch, fCat, fStatut, fFrom, fTo])

  const total = filtered.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))

  useEffect(() => {
    setPage((p) => Math.min(p, lastPage))
  }, [lastPage])

  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page, perPage])

  const sumFiltered = useMemo(() => filtered.reduce((s, d) => s + Number(d.montant || 0), 0), [filtered])

  const mCreate = useMutation({
    mutationFn: (vals: DepenseInput) => api.post('/depenses', vals),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['depenses-all'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Dépense enregistrée', tone: 'success' })
    },
    onError: (e: any) => {
      toast.push({
        title: `Erreur: ${e?.response?.data?.message ?? 'Impossible de créer la dépense'}`,
        tone: 'error',
      })
    },
  })

  const mUpdate = useMutation({
    mutationFn: ({ id, vals }: { id: number; vals: DepenseInput }) => api.put(`/depenses/${id}`, vals),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['depenses-all'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Dépense mise à jour', tone: 'success' })
    },
    onError: (e: any) => {
      toast.push({
        title: `Erreur: ${e?.response?.data?.message ?? 'Impossible de modifier la dépense'}`,
        tone: 'error',
      })
    },
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/depenses/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['depenses-all'] })
      setConfirmId(null)
      toast.push({ title: 'Dépense supprimée', tone: 'success' })
    },
    onError: (e: any) => {
      toast.push({
        title: `Erreur: ${e?.response?.data?.message ?? 'Suppression impossible'}`,
        tone: 'error',
      })
    },
  })

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (d: DepenseModel) => {
    setEditing(d)
    setFormOpen(true)
  }

  const openDetails = (d: DepenseModel) => {
    setSelected(d)
    setDetailsOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
              <Receipt size={18} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dépenses</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Suivi des charges (y compris billets émis chez une autre agence).
              </p>
            </div>
          </div>
        </div>

        <button className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
          <Plus size={16} /> Nouvelle dépense
        </button>
      </div>

      {/* Filters */}
      <FiltersBar>
        <div className="relative w-full md:w-[320px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
          <input
            className="input pl-10"
            placeholder="Rechercher (libellé, fournisseur, référence)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="input w-full md:w-[240px]" value={fCat} onChange={(e) => setFCat(e.target.value)}>
          <option value="">Toutes catégories</option>
          {Object.entries(catLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <select className="input w-full md:w-[180px]" value={fStatut} onChange={(e) => setFStatut(e.target.value)}>
          <option value="">Tous statuts</option>
          <option value="paye">Payé</option>
          <option value="en_attente">En attente</option>
        </select>

        <input className="input w-full md:w-[180px]" type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
        <input className="input w-full md:w-[180px]" type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />

        <div className="ml-auto text-sm text-gray-600 dark:text-gray-300">
          Total (filtré): <span className="font-semibold">{sumFiltered.toLocaleString('fr-FR')} FCFA</span>
        </div>
      </FiltersBar>

      {/* Table */}
      <div className="card overflow-hidden">
        <T>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Catégorie</Th>
              <Th>Libellé</Th>
              <Th>Fournisseur</Th>
              <Th className="text-right">Montant</Th>
              <Th>Statut</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((d) => {
              const items = [
                { label: 'Voir', icon: <Eye size={16} />, disabled: false, onClick: () => openDetails(d) },
                { label: 'Modifier', icon: <Pencil size={16} />, disabled: false, onClick: () => openEdit(d) },
                { label: 'Supprimer', icon: <Trash2 size={16} />, tone: 'danger' as const, disabled: false, onClick: () => setConfirmId(d.id) },
              ]
              return (
                <tr key={d.id}>
                  <Td>{d.date_depense}</Td>
                  <Td>
                    <Badge tone={catTone(d.categorie)}>{catLabel[d.categorie] ?? d.categorie}</Badge>
                  </Td>
                  <Td className="max-w-[420px]">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{d.libelle}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {d.reference ? `Réf: ${d.reference}` : '—'}
                      {d.reservation_id ? ` • Réservation #${d.reservation_id}` : ''}
                    </div>
                  </Td>
                  <Td>{d.fournisseur_nom ?? '—'}</Td>
                  <Td className="text-right font-semibold">{Number(d.montant || 0).toLocaleString('fr-FR')} FCFA</Td>
                  <Td>
                    <Badge tone={d.statut === 'paye' ? 'green' : 'amber'}>
                      {d.statut === 'paye' ? 'Payé' : 'En attente'}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <ActionsMenu items={items} />
                  </Td>
                </tr>
              )
            })}

            {!qDepenses.isLoading && pageItems.length === 0 && (
              <tr>
                <Td colSpan={7}>
                  <div className="py-8 text-center text-sm text-gray-500">Aucune dépense.</div>
                </Td>
              </tr>
            )}
          </tbody>
        </T>

        <div className="p-3 border-t border-black/5 dark:border-white/10">
          <Pagination page={page} lastPage={lastPage} total={total} onPage={setPage} />
        </div>
      </div>

      {/* Modal Form */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Modifier la dépense' : 'Nouvelle dépense'}
      >
        <DepensesForm
          defaultValues={
            editing
              ? {
                  date_depense: editing.date_depense,
                  categorie: editing.categorie,
                  libelle: editing.libelle,
                  fournisseur_nom: editing.fournisseur_nom ?? undefined,
                  reference: editing.reference ?? undefined,
                  montant: Number(editing.montant || 0),
                  mode_paiement: editing.mode_paiement ?? undefined,
                  statut: editing.statut,
                  reservation_id: editing.reservation_id ?? undefined,
                  notes: editing.notes ?? undefined,
                }
              : undefined
          }
          submitting={mCreate.isPending || mUpdate.isPending}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSubmit={(vals) => {
            if (editing) mUpdate.mutate({ id: editing.id, vals })
            else mCreate.mutate(vals)
          }}
        />
      </Modal>

      {/* Modal Details */}
      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Détails dépense">
        {selected ? <DepenseDetails depense={selected} /> : null}
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        open={confirmId != null}
        title="Supprimer la dépense ?"
        message="Cette action est définitive."
        // confirmText="Supprimer"
        // tone="error"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => confirmId && mDelete.mutate(confirmId)}
        // loading={mDelete.isPending}
      />
    </div>
  )
}
