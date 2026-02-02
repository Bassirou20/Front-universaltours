import React, { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/axios'
import { fromLaravel } from '../../lib/paginate'
import { T, Th, Td } from '../../ui/Table'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { ClientsForm, type ClientInput } from './ClientsForm'
import { FiltersBar } from '../../ui/FiltersBar'
import { Pagination } from '../../ui/Pagination'
import { useToast } from '../../ui/Toasts'
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  Upload,
  RefreshCw,
  Search,
  List,
  CalendarPlus,
} from 'lucide-react'
import { ClientDetails } from './ClientDetails'
import { ActionsMenu } from '../../ui/ActionsMenu'
import { useAuth } from '../../store/auth'

type Client = {
  id: number
  nom: string
  prenom?: string | null
  email?: string | null
  telephone?: string | null
  adresse?: string | null
  pays?: string | null
  notes?: string | null
  created_at?: string
}

type Paged<T> = {
  items: T[]
  page: number
  lastPage: number
  total: number
}

const fetchClients = async (params: { page: number; per_page: number; search?: string }): Promise<Paged<Client>> => {
  const { data } = await api.get('/clients', { params })
  return fromLaravel<Client>(data) as Paged<Client>
}

// Debounce léger pour éviter spam requêtes
function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const TableWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full overflow-x-auto rounded-2xl shadow-soft bg-white dark:bg-panel border border-black/5 dark:border-white/10">
    {children}
  </div>
)

const SkeletonRow: React.FC = () => (
  <tr className="border-t border-black/5 dark:border-white/10">
    <Td><div className="h-4 w-32 rounded bg-black/10 dark:bg-white/10" /></Td>
    <Td><div className="h-4 w-24 rounded bg-black/10 dark:bg-white/10" /></Td>
    <Td><div className="h-4 w-40 rounded bg-black/10 dark:bg-white/10" /></Td>
    <Td><div className="h-4 w-28 rounded bg-black/10 dark:bg-white/10" /></Td>
    <Td><div className="h-4 w-20 rounded bg-black/10 dark:bg-white/10" /></Td>
    <Td><div className="h-8 w-44 rounded bg-black/10 dark:bg-white/10 mx-auto" /></Td>
  </tr>
)

function ImportClientsModal({ onDone }: { onDone: () => void }) {
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const upload = async () => {
    if (!file) {
      toast.push({ title: 'Choisis un fichier Excel', tone: 'info' })
      return
    }

    const fd = new FormData()
    fd.append('excel', file)

    setLoading(true)
    try {
      await api.post('/clients/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.push({ title: 'Import terminé', tone: 'success' })
      onDone()
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erreur import.'
      toast.push({ title: msg, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/10 p-4 text-sm">
        <div className="font-medium mb-1">Format attendu</div>
        <div className="text-gray-600 dark:text-gray-400">
          Colonnes : <span className="font-mono">prenom, nom, email, telephone, adresse</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Tu peux importer .xlsx / .xls / .csv
        </div>
      </div>

      <div>
        <label className="label">Fichier</label>
        <input
          type="file"
          className="input"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          className="btn bg-gray-200 dark:bg-white/10"
          onClick={() => setFile(null)}
          disabled={loading}
        >
          Réinitialiser
        </button>
        <button className="btn-primary" onClick={upload} disabled={loading}>
          {loading ? 'Import…' : 'Importer'}
        </button>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()

  const { user } = useAuth()
  const canDelete = String(user?.role || '').toLowerCase() === 'admin'

  const [page, setPage] = useState(1)
  const [perPage] = useState(10)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  // Tri front-only
  const [sortUi, setSortUi] = useState<'recent' | 'old' | 'name_az' | 'name_za'>('recent')

  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const [editing, setEditing] = useState<Client | null>(null)
  const [viewing, setViewing] = useState<Client | null>(null)
  const [confirm, setConfirm] = useState<{ open: boolean; id?: number }>({ open: false })

  const q = useQuery<Paged<Client>>({
    queryKey: ['clients', { page, perPage, search: debouncedSearch }] as const,
    queryFn: () => fetchClients({ page, per_page: perPage, search: debouncedSearch || undefined }),
    placeholderData: keepPreviousData,
  })

  const mCreate = useMutation({
    mutationFn: (vals: ClientInput) => api.post('/clients', vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setFormOpen(false)
      toast.push({ title: 'Client créé', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur création', tone: 'error' }),
  })

  const mUpdate = useMutation({
    mutationFn: (vals: ClientInput) => api.put(`/clients/${editing?.id}`, vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Client mis à jour', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur modification', tone: 'error' }),
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.push({ title: 'Client supprimé', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Suppression impossible', tone: 'error' }),
  })

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (client: Client) => {
    setEditing(client)
    setFormOpen(true)
  }

  const openDetails = (client: Client) => {
    setViewing(client)
    setDetailsOpen(true)
  }

  const askDelete = (id: number) => setConfirm({ open: true, id })

  const doDelete = () => {
    if (confirm.id) mDelete.mutate(confirm.id)
    setConfirm({ open: false })
  }

  const clientLabel = (c: Client) => [c?.prenom, c?.nom].filter(Boolean).join(' ') || c?.nom || `Client #${c?.id}`

  const goClientReservations = (c: Client) => {
    navigate(`/reservations?client_id=${c.id}&client_label=${encodeURIComponent(clientLabel(c))}`)
  }

  const createReservationForClient = (c: Client) => {
    navigate(`/reservations?create=1&client_id=${c.id}&client_label=${encodeURIComponent(clientLabel(c))}`)
  }

  // Tri côté front
  const rows: Client[] = useMemo(() => {
    const items = q.data?.items ?? []
    const sorted = [...items]

    const byCreatedDesc = (a: Client, b: Client) => {
      const ta = new Date(a.created_at ?? 0).getTime()
      const tb = new Date(b.created_at ?? 0).getTime()
      return tb - ta
    }

    const byNameAsc = (a: Client, b: Client) => {
      const na = `${a.nom ?? ''} ${a.prenom ?? ''}`.trim()
      const nb = `${b.nom ?? ''} ${b.prenom ?? ''}`.trim()
      return na.localeCompare(nb, 'fr', { sensitivity: 'base' })
    }

    switch (sortUi) {
      case 'recent':
        sorted.sort(byCreatedDesc)
        break
      case 'old':
        sorted.sort((a, b) => -byCreatedDesc(a, b))
        break
      case 'name_az':
        sorted.sort(byNameAsc)
        break
      case 'name_za':
        sorted.sort((a, b) => -byNameAsc(a, b))
        break
    }

    return sorted
  }, [q.data, sortUi])

  const defaults = useMemo<Partial<ClientInput> | undefined>(() => {
    if (!editing) return undefined
    return {
      id: editing.id,
      nom: editing.nom ?? '',
      prenom: editing.prenom ?? '',
      email: editing.email ?? '',
      telephone: editing.telephone ?? '',
      adresse: editing.adresse ?? '',
      pays: editing.pays ?? 'Sénégal',
      notes: editing.notes ?? '',
    }
  }, [editing])

  const onSubmit = (vals: ClientInput) => (editing ? mUpdate.mutate(vals) : mCreate.mutate(vals))

  const showEmpty = !q.isLoading && !q.isError && rows.length === 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Clients</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Liste des clients enregistrés.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn bg-gray-200 dark:bg-white/10"
            onClick={() => q.refetch()}
            disabled={q.isFetching}
            title="Rafraîchir"
          >
            <RefreshCw size={16} className={q.isFetching ? 'animate-spin' : ''} />
          </button>

          <button className="btn bg-gray-200 dark:bg-white/10" onClick={() => setImportOpen(true)}>
            <Upload size={16} className="mr-2" /> Import Excel
          </button>

          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} className="mr-2" /> Nouveau
          </button>
        </div>
      </div>

      {/* Filters */}
      <FiltersBar>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3 w-full">
          <div className="w-full">
            <label className="label">Recherche</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
              <input
                className="input pl-9 pr-10"
                placeholder="Nom, email, téléphone…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
              {search && (
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
              )}
            </div>
          </div>

          <div className="w-full">
            <label className="label">Trier</label>
            <select
              className="input"
              value={sortUi}
              onChange={(e) => {
                setSortUi(e.target.value as any)
                setPage(1)
              }}
            >
              <option value="recent">Plus récents</option>
              <option value="old">Plus anciens</option>
              <option value="name_az">Nom (A → Z)</option>
              <option value="name_za">Nom (Z → A)</option>
            </select>
          </div>
        </div>
      </FiltersBar>

      {/* Content */}
      {q.isError ? (
        <div className="rounded-2xl bg-white dark:bg-panel border border-red-200/60 dark:border-red-500/30 p-4 text-red-700 dark:text-red-200">
          Erreur lors du chargement.
        </div>
      ) : showEmpty ? (
        <div className="rounded-2xl bg-white dark:bg-panel border border-black/5 dark:border-white/10 p-8 text-center shadow-soft">
          <div className="text-lg font-semibold">Aucun client trouvé</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Essaie une autre recherche ou crée un nouveau client.
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button className="btn bg-gray-200 dark:bg-white/10" onClick={() => { setSearch(''); setPage(1) }}>
              Réinitialiser
            </button>
            <button className="btn-primary" onClick={openCreate}>
              Nouveau client
            </button>
          </div>
        </div>
      ) : (
        <>
          <TableWrap>
            <T className="min-w-[820px]">
              <thead className="bg-gray-100/70 dark:bg-white/5">
                <tr>
                  <Th className="text-center">Nom</Th>
                  <Th className="text-center">Prénom</Th>
                  <Th className="text-center">Email</Th>
                  <Th className="text-center">Téléphone</Th>
                  <Th className="text-center">Pays</Th>
                  <Th className="text-center">Actions</Th>
                </tr>
              </thead>

              <tbody>
                {q.isLoading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : (
                  rows.map((c: Client) => (
                    <tr
                      key={c.id}
                      className="border-t border-black/5 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                    >
                      <Td className="font-medium text-center">{c.nom}</Td>
                      <Td className="text-center">{c.prenom ?? '—'}</Td>
                      <Td className="max-w-[260px] truncate text-center">{c.email ?? '—'}</Td>
                      <Td className="text-center">{c.telephone ?? '—'}</Td>
                      <Td className="text-center">{c.pays ?? '—'}</Td>

                      <Td className="text-center">
                        <div className="flex justify-center">
                          <ActionsMenu
                            label="Actions"
                            items={[
                              { label: 'Voir détails', icon: <Eye size={16} />, onClick: () => openDetails(c) },
                              { label: 'Modifier', icon: <Pencil size={16} />, onClick: () => openEdit(c) },

                              // { label: 'Voir réservations du client', icon: <List size={16} />, onClick: () => goClientReservations(c) },
                              { label: 'Créer réservation', icon: <CalendarPlus size={16} />, onClick: () => createReservationForClient(c) },

                              ...(canDelete
                                ? [{ label: 'Supprimer', icon: <Trash2 size={16} />, tone: 'danger' as const, onClick: () => askDelete(c.id) }]
                                : []),
                            ]}
                          />
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </T>
          </TableWrap>

          <Pagination
            page={q.data?.page ?? 1}
            lastPage={q.data?.lastPage ?? 1}
            total={q.data?.total}
            onPage={setPage}
          />
        </>
      )}

      {/* Modale création/édition */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Éditer le client' : 'Nouveau client'}
        widthClass="max-w-2xl"
      >
        <ClientsForm
          defaultValues={defaults}
          onSubmit={onSubmit}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          submitting={mCreate.isPending || mUpdate.isPending}
        />
      </Modal>

      {/* Modale détails */}
      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Détails du client"
        widthClass="max-w-3xl"
      >
        {viewing && <ClientDetails client={viewing} />}
      </Modal>

      {/* Modale import */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importer des clients (Excel)"
        widthClass="max-w-lg"
      >
        <ImportClientsModal
          onDone={() => {
            setImportOpen(false)
            qc.invalidateQueries({ queryKey: ['clients'] })
          }}
        />
      </Modal>

      {/* Confirmation suppression */}
      <ConfirmDialog
        open={confirm.open}
        title="Supprimer ce client ?"
        message="Êtes-vous sûr de vouloir supprimer ce client ?"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={doDelete}
      />
    </div>
  )
}
