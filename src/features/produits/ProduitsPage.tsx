// src/features/produits/ProduitsPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useDebouncedValue, fetchAllPaged } from '../../lib/helpers'
import type { Produit as ProduitModel } from '../../types/models'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { Pagination } from '../../ui/Pagination'
import { FiltersBar } from '../../ui/FiltersBar'
import { useToast } from '../../ui/Toasts'
import { useAuth } from '../../store/auth'
import {
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Plane,
  Building2,
  Car,
  CalendarDays,
  Loader2,
} from 'lucide-react'
import { SkeletonCards } from '../../ui/Skeleton'
import { ProduitsForm, type ProduitInput } from './ProduitsForm'
import { ProductDetails, type ProductDetailsModel } from './ProductDetails'
import { Badge } from '../../ui/Badge'
import { ActionsMenu } from '../../ui/ActionsMenu'

type Produit = ProduitModel

const TYPE_LABELS: Record<Produit['type'], string> = {
  billet_avion: "Billet d'avion",
  hotel: 'Hotel',
  voiture: 'Voiture',
  evenement: 'Evenement',
}

// Per-type visual config
const TYPE_CONFIG: Record<
  Produit['type'],
  {
    accent: string
    iconBg: string
    iconColor: string
    icon: React.ReactNode
  }
> = {
  billet_avion: {
    accent: 'bg-gradient-to-r from-sky-400 to-sky-600',
    iconBg: 'bg-sky-100 dark:bg-sky-500/15',
    iconColor: 'text-sky-600 dark:text-sky-400',
    icon: <Plane size={18} />,
  },
  hotel: {
    accent: 'bg-gradient-to-r from-violet-400 to-violet-600',
    iconBg: 'bg-violet-100 dark:bg-violet-500/15',
    iconColor: 'text-violet-600 dark:text-violet-400',
    icon: <Building2 size={18} />,
  },
  voiture: {
    accent: 'bg-gradient-to-r from-amber-400 to-amber-600',
    iconBg: 'bg-amber-100 dark:bg-amber-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
    icon: <Car size={18} />,
  },
  evenement: {
    accent: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    icon: <CalendarDays size={18} />,
  },
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
  const [confirmName, setConfirmName] = useState<string | undefined>(undefined)

  const qAll = useQuery({
    queryKey: ['produits-all'],
    queryFn: () => fetchAllPaged<Produit>('/produits'),
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
      api.post('/produits', { ...vals, devise: 'XOF' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['produits-all'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Produit cree', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur creation', tone: 'error' }),
  })

  const mUpdate = useMutation({
    mutationFn: (vals: ProduitInput) =>
      api.put(`/produits/${editing?.id}`, { ...vals, devise: 'XOF' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['produits-all'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Produit mis a jour', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur mise a jour', tone: 'error' }),
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/produits/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['produits-all'] })
      toast.push({ title: 'Produit supprime', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur suppression', tone: 'error' }),
  })

  const mSetActif = useMutation({
    mutationFn: ({ id, actif }: { id: number; actif: boolean }) =>
      api.patch(`/produits/${id}`, { actif: actif ? 1 : 0 }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['produits-all'] })
      toast.push({ title: 'Statut mis a jour', tone: 'success' })
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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center bg-sky-100 dark:bg-sky-500/15 rounded-2xl h-10 w-10 shrink-0">
            <Plane size={20} className="text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Services</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {total} service{total > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          className="inline-flex whitespace-nowrap items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-white bg-[var(--ut-orange)] hover:opacity-90 transition-opacity"
          onClick={openCreate}
        >
          <Plus size={16} /> Nouveau service
        </button>
      </div>

      {/* Filters */}
      <FiltersBar>
        <div>
          <label className="label flex items-center gap-1.5">
            Recherche
            {qAll.isFetching && !qAll.isLoading && <Loader2 size={12} className="animate-spin text-gray-400" />}
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="input !pl-9"
              placeholder="Nom, description..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        <div>
          <label className="label">Type</label>
          <select className="input" value={fType} onChange={(e) => { setFType(e.target.value); setPage(1) }}>
            <option value="">Tous</option>
            <option value="billet_avion">Billet d'avion</option>
            <option value="hotel">Hotel</option>
            <option value="voiture">Voiture</option>
            <option value="evenement">Evenement</option>
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

      {/* Content */}
      {qAll.isLoading ? (
        <SkeletonCards count={6} />
      ) : pageItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-2xl h-16 w-16">
            <Plane size={28} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700 dark:text-gray-300">Aucun service</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || fType || fActif !== 'all'
                ? 'Aucun resultat avec ces filtres.'
                : 'Commencez par creer un service.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageItems.map((p) => {
            const isActive = !!p.actif
            const cfg = TYPE_CONFIG[p.type]

            const actions = [
              {
                label: 'Supprimer',
                icon: <Trash2 size={16} />,
                tone: 'danger' as const,
                onClick: () => { setConfirmId(p.id); setConfirmName(p.nom) },
                disabled: !isAdmin,
              },
            ]

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col"
              >
                {/* Accent bar */}
                <div className={`h-[3px] w-full ${cfg.accent}`} />

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col">
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center justify-center rounded-lg h-9 w-9 ${cfg.iconBg} ${cfg.iconColor}`}>
                        {cfg.icon}
                      </div>
                      <Badge tone="blue">{TYPE_LABELS[p.type]}</Badge>
                    </div>
                    <Badge tone={isActive ? 'green' : 'red'}>{isActive ? 'Actif' : 'Inactif'}</Badge>
                  </div>

                  {/* Name */}
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-3 leading-snug">{p.nom}</p>

                  {/* Description */}
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {p.description || '—'}
                  </p>

                  {/* Price */}
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-50">
                      {Number(p.prix_base || 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400">XOF</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-1.5 border-t border-black/5 dark:border-white/[0.08] flex items-center gap-1">
                  <button
                    onClick={() => openDetails(p)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <Eye size={13} /> Voir
                  </button>

                  <button
                    onClick={() => openEdit(p)}
                    disabled={!isAdmin}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Pencil size={13} /> Modifier
                  </button>

                  <button
                    onClick={() => mSetActif.mutate({ id: p.id, actif: !isActive })}
                    disabled={mSetActif.isPending}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isActive
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                        : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                    }`}
                  >
                    {isActive ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                    {isActive ? 'Desactiver' : 'Activer'}
                  </button>

                  <div className="ml-auto">
                    <ActionsMenu items={actions} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Pagination page={page} lastPage={lastPage} total={total} perPage={perPage} onPage={setPage} />

      {/* DETAILS */}
      <Modal
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setSelected(null) }}
        title="Details du service"
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
        message="Cette action est irreversible."
        itemName={confirmName}
        onCancel={() => { setConfirmId(null); setConfirmName(undefined) }}
        onConfirm={() => {
          if (confirmId) mDelete.mutate(confirmId)
          setConfirmId(null)
          setConfirmName(undefined)
        }}
      />
    </div>
  )
}
