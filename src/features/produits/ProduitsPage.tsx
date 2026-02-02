// src/features/produits/ProduitsPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { T, Th, Td } from '../../ui/Table'
import { Pagination } from '../../ui/Pagination'
import { FiltersBar } from '../../ui/FiltersBar'
import { useToast } from '../../ui/Toasts'
import { useAuth } from '../../store/auth'
import { Eye, Pencil, Trash2, CheckCircle2, XCircle, Plus, Search } from 'lucide-react'
import { ProduitsForm, type ProduitInput } from './ProduitsForm'
import { ProductDetails, type ProductDetailsModel } from './ProductDetails'
import { Badge } from '../../ui/Badge'
import { ActionsMenu } from '../../ui/ActionsMenu'

type Produit = {
  id: number
  type: 'billet_avion' | 'hotel' | 'voiture' | 'evenement'
  nom: string
  description?: string | null
  prix_base: number
  actif: boolean | number
  created_at?: string
  updated_at?: string
}

const TYPE_LABELS: Record<Produit['type'], string> = {
  billet_avion: 'Billet d’avion',
  hotel: 'Hôtel',
  voiture: 'Voiture',
  evenement: 'Événement',
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

type LaravelPage<T> = {
  data: T[]
  current_page: number
  last_page: number
  total?: number
}

async function fetchAllProduits(): Promise<Produit[]> {
  const all: Produit[] = []
  let page = 1
  let last = 1

  for (let guard = 0; guard < 50; guard++) {
    const { data } = await api.get('/produits', { params: { page, per_page: 100 } })

    if (Array.isArray(data)) return data as Produit[]

    const lp = data as LaravelPage<Produit>
    const items = Array.isArray(lp.data) ? lp.data : []
    all.push(...items)

    last = Number(lp.last_page ?? 1)
    page = Number(lp.current_page ?? page) + 1

    if (page > last) break
  }

  return all
}

export default function ProduitsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = (user?.role ?? '').toLowerCase() === 'admin'

  // pagination locale
  const [page, setPage] = useState(1)
  const [perPage] = useState(10)

  // filters
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const [fType, setFType] = useState<string>('')
  const [fActif, setFActif] = useState<'all' | '1' | '0'>('all')

  // modals
  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const [editing, setEditing] = useState<Produit | null>(null)
  const [selected, setSelected] = useState<Produit | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const qAll = useQuery({
    queryKey: ['produits-all'],
    queryFn: fetchAllProduits,
    staleTime: 60_000,
  })

  const allItems = useMemo(() => qAll.data ?? [], [qAll.data])

  const filtered = useMemo(() => {
    let list = [...allItems]

    const s = (debouncedSearch || '').trim().toLowerCase()
    if (s) {
      list = list.filter((p) => {
        const nom = (p.nom ?? '').toLowerCase()
        const desc = (p.description ?? '').toLowerCase()
        return nom.includes(s) || desc.includes(s)
      })
    }

    if (fType) list = list.filter((p) => p.type === fType)

    if (fActif !== 'all') {
      const want = fActif === '1'
      list = list.filter((p) => !!p.actif === want)
    }

    return list
  }, [allItems, debouncedSearch, fType, fActif])

  const total = filtered.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))

  useEffect(() => {
    setPage((p) => Math.min(p, lastPage))
  }, [lastPage])

  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page, perPage])

  // --- Mutations
  const mCreate = useMutation({
    mutationFn: (vals: ProduitInput) =>
      api.post('/produits', { ...vals, devise: 'XOF' }), // devise forcée, non affichée
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['produits-all'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Produit créé', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur création', tone: 'error' }),
  })

  const mUpdate = useMutation({
    mutationFn: (vals: ProduitInput) =>
      api.put(`/produits/${editing?.id}`, { ...vals, devise: 'XOF' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['produits-all'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Produit mis à jour', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur mise à jour', tone: 'error' }),
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/produits/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['produits-all'] })
      toast.push({ title: 'Produit supprimé', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur suppression', tone: 'error' }),
  })

  const mSetActif = useMutation({
    mutationFn: ({ id, actif }: { id: number; actif: boolean }) =>
      api.patch(`/produits/${id}`, { actif: actif ? 1 : 0 }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['produits-all'] })
      toast.push({ title: 'Statut mis à jour', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Impossible de modifier le statut', tone: 'error' }),
  })

  // helpers
  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (p: Produit) => {
    setEditing(p)
    setFormOpen(true)
  }

  const openDetails = (p: Produit) => {
    setSelected(p)
    setDetailsOpen(true)
  }

  const toFormDefaults = (p?: Produit): Partial<ProduitInput> | undefined =>
    p
      ? {
          type: p.type,
          nom: p.nom,
          description: p.description ?? undefined,
          prix_base: p.prix_base ?? 0,
        }
      : undefined

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Services</h2>
        <button className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
          <Plus size={16} /> Nouveau service
        </button>
      </div>

      <FiltersBar>
        <div>
          <label className="label">Recherche</label>
          <div className="relative">
            {/* <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" /> */}
            <input
              className="input pl-9"
              placeholder="Nom, description…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        <div>
          <label className="label">Type</label>
          <select className="input" value={fType} onChange={(e) => { setFType(e.target.value); setPage(1) }}>
            <option value="">Tous</option>
            <option value="billet_avion">Billet d’avion</option>
            <option value="hotel">Hôtel</option>
            <option value="voiture">Voiture</option>
            <option value="evenement">Événement</option>
          </select>
        </div>

        <div>
          <label className="label">Actif</label>
          <select className="input" value={fActif} onChange={(e) => { setFActif(e.target.value as any); setPage(1) }}>
            <option value="all">Tous</option>
            <option value="1">Actifs</option>
            <option value="0">Inactifs</option>
          </select>
        </div>
      </FiltersBar>

      {qAll.isLoading ? (
        <p>Chargement…</p>
      ) : (
        <div className="rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
          <T>
            <thead className="bg-gray-100/70 dark:bg-white/5">
              <tr>
                <Th>Nom</Th>
                <Th className="hidden lg:table-cell">Type</Th>
                <Th>Prix de base</Th>
                <Th className="hidden lg:table-cell">Actif</Th>
                <Th className="w-[64px]">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={5}>Aucun service</td>
                </tr>
              ) : (
                pageItems.map((p) => {
                  const isActive = !!p.actif

                  const actions = [
                    { label: 'Voir', icon: <Eye size={16} />, onClick: () => openDetails(p) },
                    { label: 'Modifier', icon: <Pencil size={16} />, onClick: () => openEdit(p) },
                    {
                      label: isActive ? 'Désactiver' : 'Activer',
                      icon: isActive ? <XCircle size={16} /> : <CheckCircle2 size={16} />,
                      onClick: () => mSetActif.mutate({ id: p.id, actif: !isActive }),
                      disabled: mSetActif.isPending,
                    },
                    ...(isAdmin
                      ? [
                          {
                            label: 'Supprimer',
                            icon: <Trash2 size={16} />,
                            tone: 'danger' as const,
                            onClick: () => setConfirmId(p.id),
                          },
                        ]
                      : []),
                  ]

                  return (
                    <tr key={p.id} className="border-t border-black/5 dark:border-white/10">
                      <Td>
                        <div className="font-medium">{p.nom}</div>

                        {/* Mobile summary */}
                        <div className="text-xs text-gray-500 lg:hidden mt-1 flex flex-wrap items-center gap-2">
                          <Badge tone="blue">{TYPE_LABELS[p.type]}</Badge>
                          <Badge tone={isActive ? 'green' : 'red'}>{isActive ? 'Actif' : 'Inactif'}</Badge>
                        </div>

                        {p.description ? (
                          <div className="text-xs text-gray-500 truncate max-w-[520px]">{p.description}</div>
                        ) : (
                          <div className="text-xs text-gray-400">—</div>
                        )}
                      </Td>

                      <Td className="hidden lg:table-cell">
                        <Badge tone="blue">{TYPE_LABELS[p.type]}</Badge>
                      </Td>

                      <Td>
                        {Number(p.prix_base || 0).toLocaleString()} <span className="text-xs text-gray-500">XOF</span>
                      </Td>

                      <Td className="hidden lg:table-cell">
                        <Badge tone={isActive ? 'green' : 'red'}>{isActive ? 'Actif' : 'Inactif'}</Badge>
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

      {/* DETAILS */}
      <Modal
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setSelected(null) }}
        title="Détails du service"
        widthClass="max-w-3xl"
      >
        {selected && (
          <ProductDetails
            produit={selected as ProductDetailsModel}
          />
        )}
      </Modal>

      {/* FORM */}
      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        title={editing ? 'Modifier le service' : 'Nouveau service'}
        widthClass="max-w-3xl"
      >
        <ProduitsForm
          defaultValues={toFormDefaults(editing ?? undefined)}
          onSubmit={(vals) => (editing ? mUpdate.mutate(vals) : mCreate.mutate(vals))}
          onCancel={() => { setFormOpen(false); setEditing(null) }}
          submitting={mCreate.isPending || mUpdate.isPending}
        />
      </Modal>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        open={confirmId !== null}
        title="Supprimer ce service ?"
        message="Cette action est irréversible."
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId) mDelete.mutate(confirmId)
          setConfirmId(null)
        }}
      />
    </div>
  )
}
