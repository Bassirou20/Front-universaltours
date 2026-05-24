// src/features/forfaits/ForfaitsPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useDebouncedValue, normalizeList, fetchAllPaged } from '../../lib/helpers'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { Pagination } from '../../ui/Pagination'
import { FiltersBar } from '../../ui/FiltersBar'
import { useToast } from '../../ui/Toasts'
import { useAuth } from '../../store/auth'
import { Badge } from '../../ui/Badge'
import { ActionsMenu } from '../../ui/ActionsMenu'
import {
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Package,
  FolderGit2,
  User,
  Users,
  Home,
  CalendarDays,
  Loader2,
} from 'lucide-react'
import { SkeletonCards } from '../../ui/Skeleton'

import { ForfaitsForm, type ForfaitFormVals } from './ForfaitsForm'
import { ForfaitDetails, type ForfaitModel } from './ForfaitDetails'

// ---------------- Types ----------------
export type Forfait = ForfaitModel

// ---------------- Helpers ----------------
const TYPE_LABEL: Record<Forfait['type'], string> = {
  couple: 'Couple',
  famille: 'Famille',
  solo: 'Solo',
}

const moneyXof = (n: any) => Number(n || 0).toLocaleString()

const toFormDefaults = (f?: Forfait) =>
  f
    ? {
        nom: f.nom,
        type: f.type,
        event_id: f.event_id,
        nombre_max_personnes: f.nombre_max_personnes,
        devise: 'XOF',
        description: f.description ?? undefined,
        prix: f.prix ?? undefined,
        prix_adulte: f.prix_adulte ?? undefined,
        prix_enfant: f.prix_enfant ?? undefined,
      }
    : undefined

// Per-type visual config
const TYPE_CONFIG: Record<
  Forfait['type'],
  {
    accent: string
    iconBg: string
    iconColor: string
    icon: React.ReactNode
  }
> = {
  solo: {
    accent: 'bg-gradient-to-r from-sky-400 to-sky-600',
    iconBg: 'bg-sky-100 dark:bg-sky-500/15',
    iconColor: 'text-sky-600 dark:text-sky-400',
    icon: <User size={18} />,
  },
  couple: {
    accent: 'bg-gradient-to-r from-rose-400 to-rose-600',
    iconBg: 'bg-rose-100 dark:bg-rose-500/15',
    iconColor: 'text-rose-600 dark:text-rose-400',
    icon: <Users size={18} />,
  },
  famille: {
    accent: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    icon: <Home size={18} />,
  },
}

// ---------------- Component ----------------
export default function ForfaitsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = String(user?.role ?? '').toLowerCase() === 'admin'

  // UI state
  const [page, setPage] = useState(1)
  const [perPage] = useState(10)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 250)

  const [fType, setFType] = useState<string>('')
  const [actif, setActif] = useState<'all' | '1' | '0'>('all')
  const [eventId, setEventId] = useState<number | 'all'>('all')

  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const [editing, setEditing] = useState<Forfait | null>(null)
  const [selected, setSelected] = useState<Forfait | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [confirmName, setConfirmName] = useState<string | undefined>(undefined)

  // Events (produits type "evenement")
  const qEvents = useQuery({
    queryKey: ['produits', 'evenements', 'simple'],
    queryFn: async () => (await api.get('/produits', { params: { simple: 1 } })).data,
    staleTime: 60_000,
  })

  const events = useMemo(() => {
    const list = normalizeList(qEvents.data)
    return list.filter((p: any) => p?.type === 'evenement' || String(p?.categorie ?? '').toLowerCase() === 'evenement')
  }, [qEvents.data])

  const eventMap = useMemo(() => {
    const m = new Map<number, string>()
    ;(events || []).forEach((e: any) => m.set(Number(e.id), e.nom || e.name || e.titre || `#${e.id}`))
    return m
  }, [events])

  // All forfaits
  const qAll = useQuery({
    queryKey: ['forfaits-all'],
    queryFn: () => fetchAllPaged<Forfait>('/forfaits'),
    staleTime: 60_000,
  })

  const allItems = useMemo(() => qAll.data ?? [], [qAll.data])

  // Filtering
  const filtered = useMemo(() => {
    let list = [...allItems]

    const s = (debouncedSearch || '').trim().toLowerCase()
    if (s) {
      list = list.filter((f) => {
        const nom = (f.nom ?? '').toLowerCase()
        const desc = (f.description ?? '').toLowerCase()
        const ev = (eventMap.get(Number(f.event_id)) ?? '').toLowerCase()
        return nom.includes(s) || desc.includes(s) || ev.includes(s)
      })
    }

    if (fType) list = list.filter((f) => f.type === fType)

    if (actif !== 'all') {
      const want = actif === '1'
      list = list.filter((f) => !!f.actif === want)
    }

    if (eventId !== 'all') {
      list = list.filter((f) => Number(f.event_id) === Number(eventId))
    }

    // newest first
    list.sort((a, b) => (b.id || 0) - (a.id || 0))
    return list
  }, [allItems, debouncedSearch, fType, actif, eventId, eventMap])

  // Pagination
  const total = filtered.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))

  useEffect(() => {
    setPage((p) => Math.min(p, lastPage))
  }, [lastPage])

  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page, perPage])

  // Summary counts
  const activeCount = useMemo(() => allItems.filter((f) => !!f.actif).length, [allItems])
  const inactiveCount = allItems.length - activeCount

  // Mutations
  const mCreate = useMutation({
    mutationFn: (vals: ForfaitFormVals) => api.post('/forfaits', vals),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['forfaits-all'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Forfait cree', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur creation', tone: 'error' }),
  })

  const mUpdate = useMutation({
    mutationFn: (vals: ForfaitFormVals) => api.put(`/forfaits/${editing?.id}`, vals),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['forfaits-all'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Forfait mis a jour', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur mise a jour', tone: 'error' }),
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/forfaits/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['forfaits-all'] })
      toast.push({ title: 'Forfait supprime', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur suppression', tone: 'error' }),
  })

  const mSetActif = useMutation({
    mutationFn: ({ id, actif }: { id: number; actif: boolean }) =>
      api.patch(`/forfaits/${id}`, { actif: actif ? 1 : 0 }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['forfaits-all'] })
      toast.push({ title: 'Statut mis a jour', tone: 'success' })
    },
    onError: (e: any) =>
      toast.push({ title: e?.response?.data?.message || 'Impossible de modifier le statut', tone: 'error' }),
  })

  // Handlers
  const openCreate = () => {
    if (!isAdmin) return toast.push({ title: 'Acces reserve admin', tone: 'error' })
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (f: Forfait) => {
    if (!isAdmin) return toast.push({ title: 'Acces reserve admin', tone: 'error' })
    setEditing(f)
    setFormOpen(true)
  }

  const openDetails = (f: Forfait) => {
    setSelected(f)
    setDetailsOpen(true)
  }

  const onSubmit = (vals: ForfaitFormVals) => (editing ? mUpdate.mutate(vals) : mCreate.mutate(vals))

  const clearFilters = () => {
    setSearch('')
    setFType('')
    setActif('all')
    setEventId('all')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
            <FolderGit2 size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">Forfaits</h2>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
                {total} forfait{total > 1 ? 's' : ''}
              </p>
              {allItems.length > 0 && (
                <>
                  <Badge tone="green">{activeCount} actif{activeCount > 1 ? 's' : ''}</Badge>
                  {inactiveCount > 0 && (
                    <Badge tone="red">{inactiveCount} inactif{inactiveCount > 1 ? 's' : ''}</Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <button
          className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          onClick={openCreate}
          disabled={!isAdmin}
          title={!isAdmin ? 'Réservé admin' : 'Créer un forfait'}
        >
          <Plus size={15} /> Nouveau forfait
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
              placeholder="Nom, description, evenement..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>

        <div>
          <label className="label">Type</label>
          <select
            className="input"
            value={fType}
            onChange={(e) => {
              setFType(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Tous</option>
            <option value="solo">Solo</option>
            <option value="couple">Couple</option>
            <option value="famille">Famille</option>
          </select>
        </div>

        <div>
          <label className="label">Actif</label>
          <select
            className="input"
            value={actif}
            onChange={(e) => {
              setActif(e.target.value as any)
              setPage(1)
            }}
          >
            <option value="all">Tous</option>
            <option value="1">Actifs</option>
            <option value="0">Inactifs</option>
          </select>
        </div>

        <div>
          <label className="label">Evenement</label>
          <select
            className="input"
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value === 'all' ? 'all' : Number(e.target.value))
              setPage(1)
            }}
          >
            <option value="all">Tous</option>
            {events.map((ev: any) => (
              <option key={ev.id} value={ev.id}>
                {ev.nom || ev.name || `#${ev.id}`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button type="button" className="btn bg-gray-200 dark:bg-white/10 w-full" onClick={clearFilters}>
            Reinitialiser
          </button>
        </div>
      </FiltersBar>

      {/* Content */}
      {qAll.isLoading ? (
        <SkeletonCards count={6} />
      ) : qAll.isError ? (
        <div className="card">
          <div className="text-red-600 font-semibold">Impossible de charger les forfaits</div>
          <div className="text-sm text-gray-500 mt-1">Verifiez l'endpoint /forfaits et votre authentification.</div>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-2xl h-16 w-16">
            <Package size={28} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700 dark:text-gray-300">Aucun forfait</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || fType || actif !== 'all' || eventId !== 'all'
                ? 'Aucun resultat avec ces filtres.'
                : 'Commencez par creer un forfait pour un evenement.'}
            </p>
          </div>
          {isAdmin && (
            <button className="inline-flex whitespace-nowrap items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-white bg-[var(--ut-orange)] hover:opacity-90 transition-opacity" onClick={openCreate}>
              <Plus size={16} /> Creer un forfait
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageItems.map((f) => {
            const eventName = eventMap.get(Number(f.event_id)) || `#${f.event_id}`
            const isActive = !!f.actif
            const cfg = TYPE_CONFIG[f.type]
            const canMutate = isAdmin && !mSetActif.isPending && !mDelete.isPending

            const actions = [
              {
                label: 'Supprimer',
                icon: <Trash2 size={16} />,
                tone: 'danger' as const,
                onClick: () => { setConfirmId(f.id); setConfirmName(f.nom) },
                disabled: !isAdmin,
              },
            ]

            return (
              <div
                key={f.id}
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
                      <Badge tone="blue">{TYPE_LABEL[f.type]}</Badge>
                    </div>
                    <Badge tone={isActive ? 'green' : 'red'}>{isActive ? 'Actif' : 'Inactif'}</Badge>
                  </div>

                  {/* Name */}
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-3 leading-snug">{f.nom}</p>

                  {/* Event */}
                  <div className="flex items-center gap-1 mt-1">
                    <CalendarDays size={11} className="text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-400 truncate">{eventName}</span>
                  </div>

                  {/* Description */}
                  {f.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{f.description}</p>
                  )}

                  {/* Price section */}
                  <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/[0.06]">
                    {f.type === 'famille' ? (
                      <div className="space-y-0.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-14">Adulte :</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {moneyXof(f.prix_adulte)}
                          </span>
                          <span className="text-xs text-gray-400">XOF</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-14">Enfant :</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {moneyXof(f.prix_enfant)}
                          </span>
                          <span className="text-xs text-gray-400">XOF</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-50">
                          {moneyXof(f.prix)}
                        </span>
                        <span className="text-xs text-gray-400">XOF</span>
                      </div>
                    )}
                  </div>

                  {/* Capacity */}
                  {f.nombre_max_personnes != null && (
                    <div className="flex items-center gap-1 mt-2">
                      <Users size={11} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-400">Max {f.nombre_max_personnes} pers.</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-1.5 border-t border-black/5 dark:border-white/[0.08] flex items-center gap-1">
                  <button
                    onClick={() => openDetails(f)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <Eye size={13} /> Voir
                  </button>

                  <button
                    onClick={() => openEdit(f)}
                    disabled={!isAdmin}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Pencil size={13} /> Modifier
                  </button>

                  <button
                    onClick={() => mSetActif.mutate({ id: f.id, actif: !isActive })}
                    disabled={!canMutate}
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
        onClose={() => {
          setDetailsOpen(false)
          setSelected(null)
        }}
        title="Details du forfait"
        widthClass="max-w-3xl"
      >
        {selected ? (
          <ForfaitDetails
            forfait={selected}
            eventName={eventMap.get(Number(selected.event_id))}
            onEdit={
              isAdmin
                ? () => {
                    setDetailsOpen(false)
                    openEdit(selected)
                  }
                : undefined
            }
          />
        ) : (
          <div className="py-4 text-sm text-gray-500">Aucune donnee.</div>
        )}
      </Modal>

      {/* FORM */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Modifier le forfait' : 'Nouveau forfait'}
        widthClass="max-w-3xl"
      >
        <ForfaitsForm
          defaultValues={toFormDefaults(editing ?? undefined)}
          onSubmit={onSubmit}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          submitting={mCreate.isPending || mUpdate.isPending}
        />
      </Modal>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        open={confirmId !== null}
        title="Supprimer ce forfait ?"
        message="Cette action est irreversible."
        itemName={confirmName}
        onCancel={() => { setConfirmId(null); setConfirmName(undefined) }}
        onConfirm={() => {
          if (confirmId != null) mDelete.mutate(confirmId)
          setConfirmId(null)
          setConfirmName(undefined)
        }}
      />
    </div>
  )
}
