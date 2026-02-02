// src/features/forfaits/ForfaitsPage.tsx
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
import { ForfaitsForm, type ForfaitFormVals } from './ForfaitsForm'
import { ForfaitDetails } from './ForfaitDetails'
import { Badge } from '../../ui/Badge'
import { ActionsMenu } from '../../ui/ActionsMenu'

// --- Types alignés sur le backend ---
export type Forfait = {
  id: number
  nom: string
  description?: string | null
  prix?: number | null // solo/couple
  event_id: number // FK -> produits (type evenement)
  nombre_max_personnes: number
  prix_adulte?: number | null // famille
  prix_enfant?: number | null // famille
  type: 'couple' | 'famille' | 'solo'
  actif: boolean | number
  created_at?: string
  updated_at?: string
}

const TYPE_LABEL: Record<Forfait['type'], string> = {
  couple: 'Couple',
  famille: 'Famille',
  solo: 'Solo',
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const normalizeList = (input: any): any[] => {
  if (!input) return []
  if (Array.isArray(input)) return input
  if (Array.isArray(input.data)) return input.data
  if (Array.isArray(input?.data?.data)) return input.data.data
  if (Array.isArray(input.items)) return input.items
  return []
}

const moneyXof = (n: any) => Number(n || 0).toLocaleString()

// Normalise l’item backend vers les defaultValues du formulaire (null -> undefined)
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

type LaravelPage<T> = {
  data: T[]
  current_page: number
  last_page: number
  total?: number
}

/**
 * Récupère “tous” les forfaits (pagination backend), puis on filtre côté front.
 * - per_page = 100
 * - garde-fou: 50 pages max pour éviter boucle infinie
 */
async function fetchAllForfaits(): Promise<Forfait[]> {
  const all: Forfait[] = []
  let page = 1
  let last = 1

  for (let guard = 0; guard < 50; guard++) {
    const { data } = await api.get('/forfaits', { params: { page, per_page: 100 } })

    // cas 1: backend renvoie un tableau brut
    if (Array.isArray(data)) return data as Forfait[]

    // cas 2: paginate Laravel
    const lp = data as LaravelPage<Forfait>
    const items = Array.isArray(lp.data) ? lp.data : []
    all.push(...items)

    last = Number(lp.last_page ?? 1)
    page = Number(lp.current_page ?? page) + 1

    if (page > last) break
  }

  return all
}

export default function ForfaitsPage() {
  // ---------- UI state
  const [page, setPage] = useState(1)
  const [perPage] = useState(10)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const [fType, setFType] = useState<string>('')

  // filtres
  const [actif, setActif] = useState<'all' | '1' | '0'>('all')
  const [eventId, setEventId] = useState<number | 'all'>('all')

  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const [editing, setEditing] = useState<Forfait | null>(null)
  const [selected, setSelected] = useState<Forfait | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const qc = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = (user?.role ?? '').toLowerCase() === 'admin'

  // ---------- Query events (produits type "evenement") pour afficher le nom au lieu de l'id
  const qEvents = useQuery({
    queryKey: ['produits', 'evenements', 'simple'],
    queryFn: async () => (await api.get('/produits', { params: { simple: 1 } })).data,
  })

  const events = useMemo(() => {
    const list = normalizeList(qEvents.data)
    return list.filter((p: any) => p?.type === 'evenement' || (p?.categorie ?? '') === 'evenement')
  }, [qEvents.data])

  const eventMap = useMemo(() => {
    const m = new Map<number, string>()
    ;(events || []).forEach((e: any) => m.set(Number(e.id), e.nom || e.name || e.titre || `#${e.id}`))
    return m
  }, [events])

  // ---------- Query ALL forfaits (front-side filtering)
  const qAll = useQuery({
    queryKey: ['forfaits-all'],
    queryFn: fetchAllForfaits,
    staleTime: 60_000,
  })

  const allItems = useMemo(() => qAll.data ?? [], [qAll.data])

  // ---------- Front-side filtering
  const filtered = useMemo(() => {
    let list = [...allItems]

    const s = (debouncedSearch || '').trim().toLowerCase()
    if (s) {
      list = list.filter((f) => {
        const nom = (f.nom ?? '').toLowerCase()
        const desc = (f.description ?? '').toLowerCase()
        return nom.includes(s) || desc.includes(s)
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

    return list
  }, [allItems, debouncedSearch, fType, actif, eventId])

  // ---------- Front-side pagination
  const total = filtered.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))

  useEffect(() => {
    setPage((p) => Math.min(p, lastPage))
  }, [lastPage])

  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page, perPage])

  // ---------- Mutations
  const mCreate = useMutation({
    mutationFn: (vals: ForfaitFormVals) => api.post('/forfaits', vals),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['forfaits-all'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Forfait créé', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur création', tone: 'error' }),
  })

  const mUpdate = useMutation({
    mutationFn: (vals: ForfaitFormVals) => api.put(`/forfaits/${editing?.id}`, vals),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['forfaits-all'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Forfait mis à jour', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur mise à jour', tone: 'error' }),
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/forfaits/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['forfaits-all'] })
      toast.push({ title: 'Forfait supprimé', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur suppression', tone: 'error' }),
  })

  // ✅ Toggle actif via PATCH + 1/0 (TINYINT(1))
  const mSetActif = useMutation({
    mutationFn: ({ id, actif }: { id: number; actif: boolean }) =>
      api.patch(`/forfaits/${id}`, { actif: actif ? 1 : 0 }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['forfaits-all'] })
      toast.push({ title: 'Statut mis à jour', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Impossible de modifier le statut', tone: 'error' }),
  })

  // ---------- Handlers
  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (f: Forfait) => {
    setEditing(f)
    setFormOpen(true)
  }

  const openDetails = (f: Forfait) => {
    setSelected(f)
    setDetailsOpen(true)
  }

  const onSubmit = (vals: ForfaitFormVals) => (editing ? mUpdate.mutate(vals) : mCreate.mutate(vals))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Forfaits</h2>
        <button className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
          <Plus size={16} /> Nouveau
        </button>
      </div>

      <FiltersBar>
        <div>
          <label className="label">Recherche</label>
          <div className="relative">
            {/* <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" /> */}
            <input
              className="input pl-9"
              placeholder="Nom…"
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
          <label className="label">Événement</label>
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
                {ev.nom || ev.name}
              </option>
            ))}
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
                <Th className="hidden lg:table-cell">Événement</Th>
                <Th className="hidden lg:table-cell">Type</Th>
                <Th className="hidden lg:table-cell">Capacité</Th>
                <Th>Tarifs</Th>
                <Th className="hidden lg:table-cell">Actif</Th>
                <Th className="w-[64px]"></Th>
              </tr>
            </thead>

            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={7}>
                    Aucun forfait
                  </td>
                </tr>
              ) : (
                pageItems.map((f) => {
                  const eventName = eventMap.get(Number(f.event_id)) || `#${f.event_id}`
                  const isActive = !!f.actif

                  const actions = [
                    { label: 'Voir', icon: <Eye size={16} />, onClick: () => openDetails(f) },
                    { label: 'Modifier', icon: <Pencil size={16} />, onClick: () => openEdit(f) },
                    {
                      label: isActive ? 'Désactiver' : 'Activer',
                      icon: isActive ? <XCircle size={16} /> : <CheckCircle2 size={16} />,
                      onClick: () => mSetActif.mutate({ id: f.id, actif: !isActive }),
                      disabled: mSetActif.isPending,
                    },
                    
                          {
                            label: 'Supprimer',
                            icon: <Trash2 size={16} />,
                            tone: 'danger' as const,
                            onClick: () => setConfirmId(f.id),
                          },
        
                  
                        ]
                  return (
                    <tr key={f.id} className="border-t border-black/5 dark:border-white/10">
                      <Td>
                        <div className="font-medium">{f.nom}</div>

                        {/* mobile summary */}
                        <div className="text-xs text-gray-500 lg:hidden mt-1">
                          <span className="mr-2">{TYPE_LABEL[f.type]}</span>
                          <span className="mr-2">•</span>
                          <span className="mr-2">{eventName}</span>
                          <span className="mr-2">•</span>
                          <Badge tone={isActive ? 'green' : 'red'}>{isActive ? 'Actif' : 'Inactif'}</Badge>
                        </div>

                        {f.description ? (
                          <div className="text-xs text-gray-500 truncate max-w-[520px]">{f.description}</div>
                        ) : (
                          <div className="text-xs text-gray-400">—</div>
                        )}
                      </Td>

                      <Td className="hidden lg:table-cell">
                        <span className="text-sm">{eventName}</span>
                      </Td>

                      <Td className="hidden lg:table-cell">
                        <Badge tone="blue">{TYPE_LABEL[f.type]}</Badge>
                      </Td>

                      <Td className="hidden lg:table-cell">{f.nombre_max_personnes}</Td>

                      <Td>
                        {f.type === 'famille' ? (
                          <span>
                            {moneyXof(f.prix_adulte)} / Adulte — {moneyXof(f.prix_enfant)} / Enfant
                          </span>
                        ) : (
                          <span>{moneyXof(f.prix)}</span>
                        )}{' '}
                        <span className="text-xs text-gray-500">XOF</span>
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
        onClose={() => {
          setDetailsOpen(false)
          setSelected(null)
        }}
        title="Détails du forfait"
        widthClass="max-w-3xl"
      >
        {selected && (
          <ForfaitDetails
            forfait={selected}
            eventName={eventMap.get(Number(selected.event_id))}
            onEdit={() => {
              setDetailsOpen(false)
              openEdit(selected)
            }}
          />
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
