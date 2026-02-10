// src/features/clients/ClientsPage.tsx
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
import ClientDetails from './ClientDetails'
import ClientsForm from './ClientsForm'
import { Plus, Search, Eye, Pencil, Trash2, X, Upload, Users, Phone, Mail, Globe } from 'lucide-react'

// -------------------- helpers --------------------
function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/**
 * Supporte:
 * 1) Laravel paginate direct: { data: [], current_page, last_page, total }
 * 2) Laravel paginate enveloppé: { data: { data: [], current_page, last_page, total } }
 * 3) fallback: { items: [], page, lastPage, total }
 */
const normalizePaged = (input: any) => {
  const root = input?.data?.data && Array.isArray(input.data.data) ? input.data : input

  const items = Array.isArray(root?.data)
    ? root.data
    : Array.isArray(root?.items)
    ? root.items
    : Array.isArray(root)
    ? root
    : []

  return {
    items,
    page: Number(root?.current_page ?? root?.page ?? 1) || 1,
    lastPage: Number(root?.last_page ?? root?.lastPage ?? 1) || 1,
    total: Number(root?.total ?? items.length ?? 0) || 0,
  }
}

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ')
}

function initialsFromClient(c: any) {
  const a = String(c?.prenom || '').trim()
  const b = String(c?.nom || '').trim()
  const s = `${a} ${b}`.trim() || String(c?.nom || '').trim() || 'CL'
  const parts = s.split(/\s+/).filter(Boolean)
  const i1 = parts[0]?.[0] ?? 'C'
  const i2 = parts[1]?.[0] ?? parts[0]?.[1] ?? 'L'
  return `${i1}${i2}`.toUpperCase()
}

function displayClientName(c: any) {
  return [c?.prenom, c?.nom].filter(Boolean).join(' ').trim() || c?.nom || `Client #${c?.id ?? '—'}`
}

function ToneBadge({
  tone,
  children,
}: {
  tone: 'gray' | 'blue' | 'green' | 'amber'
  children: React.ReactNode
}) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap'
  const cls =
    tone === 'green'
      ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
      : tone === 'amber'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
      : tone === 'blue'
      ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
      : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200'
  return <span className={`${base} ${cls}`}>{children}</span>
}

type Client = any

export default function ClientsPage() {
  const qc = useQueryClient()
  const toast = useToast()

  // pagination
  const [page, setPage] = useState(1)
  const perPage = 10

  // filtres
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [sort, setSort] = useState<'recent' | 'alpha'>('recent')

  // modals
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [viewing, setViewing] = useState<Client | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id?: number }>({ open: false })

  // -------------------- Query --------------------
  const q = useQuery({
    queryKey: ['clients', { page, perPage, search: debouncedSearch, sort }] as const,
    queryFn: async () => {
      const { data } = await api.get('/clients', {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          sort: sort === 'alpha' ? 'alpha' : 'recent',
        },
      })
      return data
    },
    placeholderData: keepPreviousData,
  })

  const paged = useMemo(() => normalizePaged(q.data), [q.data])
  const rows: Client[] = useMemo(() => paged.items ?? [], [paged.items])

  // ✅ pagination guard: si page > lastPage (ex: suppression dernier item), on recale
  useEffect(() => {
    if (!q.isFetching && paged.lastPage && page > paged.lastPage) {
      setPage(paged.lastPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paged.lastPage, q.isFetching])

  // -------------------- Mutations --------------------
  const mCreate = useMutation({
    mutationFn: async (vals: any) => {
      const res = await api.post('/clients', vals)
      return res.data?.data ?? res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Client créé', tone: 'success' })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la création.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  const mUpdate = useMutation({
    mutationFn: async (vals: any) => {
      if (!editing?.id) throw new Error('Client ID manquant')
      // PATCH recommandé, mais si ton backend attend PUT, remplace par api.put
      const res = await api.patch(`/clients/${editing.id}`, vals)
      return res.data?.data ?? res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Client mis à jour', tone: 'success' })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la mise à jour.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.push({ title: 'Client supprimé', tone: 'success' })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la suppression.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  const isPending = mCreate.isPending || mUpdate.isPending || mDelete.isPending

  // -------------------- actions --------------------
  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (c: any) => {
    setEditing(c)
    setFormOpen(true)
  }

  const openDetails = (c: any) => {
    setViewing(c)
    setDetailsOpen(true)
  }

  const askDelete = (id: number) => setConfirmDelete({ open: true, id })
  const doDelete = () => {
    if (confirmDelete.id) mDelete.mutate(confirmDelete.id)
    setConfirmDelete({ open: false })
  }

  // -------------------- UI --------------------
  const total = Number(paged.total || 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 flex items-center justify-center">
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold truncate">Clients</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                Liste des clients enregistrés, accès rapide aux contacts.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <ToneBadge tone="gray">{total} client{total > 1 ? 's' : ''}</ToneBadge>
            {debouncedSearch ? <ToneBadge tone="blue">Filtre: “{debouncedSearch}”</ToneBadge> : null}
            <ToneBadge tone="amber">Tri: {sort === 'alpha' ? 'A → Z' : 'Plus récents'}</ToneBadge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn bg-gray-200 dark:bg-white/10"
            onClick={() => toast.push({ title: 'Branche ton import ici (ou garde ton bouton actuel).', tone: 'info' })}
            title="Importer des clients"
          >
            <Upload size={16} className="mr-2" /> Import Excel
          </button>

          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus size={16} className="mr-2" /> Nouveau
          </button>
        </div>
      </div>

      {/* Filters */}
      <FiltersBar>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3 w-full">
          <div>
            <label className="label">Recherche</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="input pl-9 pr-10"
                placeholder="Nom, email, téléphone…"
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
            <label className="label">Trier</label>
            <select
              className="input"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as any)
                setPage(1)
              }}
            >
              <option value="recent">Plus récents</option>
              <option value="alpha">A → Z</option>
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
                <Th>Client</Th>
                <Th className="hidden lg:table-cell">Email</Th>
                <Th className="hidden lg:table-cell">Téléphone</Th>
                <Th className="hidden lg:table-cell">Pays</Th>
                <Th className="text-center">Actions</Th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <Td colSpan={5} className="text-center py-10">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <div className="h-12 w-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] flex items-center justify-center">
                        <Users size={20} />
                      </div>
                      <div className="font-medium">Aucun client trouvé</div>
                      <div className="text-sm">Essaie un autre mot-clé ou crée un nouveau client.</div>
                      <button type="button" className="btn-primary mt-2" onClick={openCreate}>
                        <Plus size={16} className="mr-2" /> Ajouter un client
                      </button>
                    </div>
                  </Td>
                </tr>
              ) : (
                rows.map((c: any) => {
                  const name = displayClientName(c)
                  const initials = initialsFromClient(c)

                  const actions = [
                    { label: 'Voir', icon: <Eye size={16} />, onClick: () => openDetails(c) },
                    { label: 'Modifier', icon: <Pencil size={16} />, onClick: () => openEdit(c) },
                    {
                      label: 'Supprimer',
                      icon: <Trash2 size={16} />,
                      tone: 'danger' as const,
                      onClick: () => askDelete(c.id),
                      disabled: isPending,
                    },
                  ]

                  return (
                    <tr
                      key={c.id}
                      className="border-t border-black/5 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                    >
                      <Td className="min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 flex items-center justify-center font-semibold">
                            {initials}
                          </div>

                          <div className="min-w-0">
                            <div className="font-semibold truncate">{name}</div>

                            {/* Mobile summary */}
                            <div className="mt-1 text-xs text-gray-500 lg:hidden flex flex-wrap items-center gap-2">
                              {c?.telephone ? (
                                <span className="inline-flex items-center gap-1">
                                  <Phone size={12} /> {c.telephone}
                                </span>
                              ) : null}
                              {c?.email ? (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1">
                                    <Mail size={12} /> {c.email}
                                  </span>
                                </>
                              ) : null}
                              {c?.pays ? (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1">
                                    <Globe size={12} /> {c.pays}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </Td>

                      <Td className="hidden lg:table-cell">
                        {c?.email ? (
                          <span className="inline-flex items-center gap-2 text-sm">
                            <Mail size={14} className="text-gray-500" /> {c.email}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </Td>

                      <Td className="hidden lg:table-cell">
                        {c?.telephone ? (
                          <span className="inline-flex items-center gap-2 text-sm">
                            <Phone size={14} className="text-gray-500" /> {c.telephone}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </Td>

                      <Td className="hidden lg:table-cell">
                        {c?.pays ? <ToneBadge tone="gray">{c.pays}</ToneBadge> : <span className="text-gray-500">—</span>}
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

      {/* Details Modal */}
      <Modal
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false)
          setViewing(null)
        }}
        title="Détails du client"
        widthClass="max-w-[980px]"
      >
        {viewing ? (
          <ClientDetails
            client={viewing}
            onClose={() => {
              setDetailsOpen(false)
              setViewing(null)
            }}
          />
        ) : (
          <div className="py-6 text-sm text-gray-500">Aucune donnée.</div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Modifier client' : 'Nouveau client'}
        widthClass="max-w-[980px]"
      >
        <ClientsForm
          defaultValues={editing ?? undefined}
          submitting={mCreate.isPending || mUpdate.isPending}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSubmit={(vals: any) => {
            if (editing?.id) mUpdate.mutate(vals)
            else mCreate.mutate(vals)
          }}
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmDelete.open}
        onCancel={() => setConfirmDelete({ open: false })}
        onConfirm={doDelete}
        title="Supprimer ce client ?"
        message="Cette action est irréversible."
      />
    </div>
  )
}
