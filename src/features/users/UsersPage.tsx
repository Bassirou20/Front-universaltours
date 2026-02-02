import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/axios'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { T, Th, Td } from '../../ui/Table'
import { Pagination } from '../../ui/Pagination'
import { FiltersBar } from '../../ui/FiltersBar'
import { useToast } from '../../ui/Toasts'
import { useAuth } from '../../store/auth'
import { Badge } from '../../ui/Badge'
import { ActionsMenu } from '../../ui/ActionsMenu'
import { Eye, Pencil, Trash2, Plus, Search, CheckCircle2, XCircle, Users } from 'lucide-react'
import UsersForm, { type UserInput } from './UsersForm'
import UserDetails, { type UserModel } from './UserDetails'

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

// ✅ Ton backend expose /users maintenant
async function fetchUsers(): Promise<UserModel[]> {
  try {
    const res = await api.get('/users', { params: { page: 1, per_page: 100 } })
    const data = res.data
    if (Array.isArray(data)) return data as UserModel[]
    if (Array.isArray(data?.data)) {
      const all = await fetchAllPaged<UserModel>('/users')
      return all.length ? all : (data.data as UserModel[])
    }
    return []
  } catch (e) {
    // si API non dispo (ou 403 si non-admin), on remonte l’erreur
    throw e
  }
}

const roleTone = (role?: string | null) => {
  const r = String(role || '').toLowerCase()
  if (r.includes('admin')) return 'purple'
  if (r.includes('employee')) return 'blue'
  return 'gray'
}

export default function UsersPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const { user: me, refreshMe } = useAuth()
const isAdmin = String(me?.role || '').toLowerCase() === 'admin'


  // ✅ Interdire complètement l’accès aux non-admin
  useEffect(() => {
    if (me && !isAdmin) navigate('/', { replace: true })
  }, [me, isAdmin, navigate])

  if (me && !isAdmin) return null

  const [page, setPage] = useState(1)
  const [perPage] = useState(10)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [fRole, setFRole] = useState('')
  const [fActif, setFActif] = useState<'all' | '1' | '0'>('1')

  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editing, setEditing] = useState<UserModel | null>(null)
  const [selected, setSelected] = useState<UserModel | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const [confirmRole, setConfirmRole] = useState<{
  open: boolean
  next?: any
  oldRole?: string
  newRole?: string
}>({ open: false })


  const qUsers = useQuery({
    queryKey: ['users-all'],
    queryFn: fetchUsers,
    staleTime: 30_000,
    retry: false,
    enabled: !!me && isAdmin, // ✅ on ne tente même pas si pas admin
  })

  const users = useMemo(() => qUsers.data ?? [], [qUsers.data])

  const roles = useMemo(() => {
    const set = new Set<string>()
    for (const u of users) if (u.role) set.add(String(u.role))
    return Array.from(set).sort()
  }, [users])

  const filtered = useMemo(() => {
    let list = [...users]

    const s = (debouncedSearch || '').trim().toLowerCase()
    if (s) {
      list = list.filter((u) => {
        const nom = `${u.prenom || ''} ${u.nom || ''}`.trim().toLowerCase()
        const email = (u.email || '').toLowerCase()
        return nom.includes(s) || email.includes(s) || String(u.id).includes(s)
      })
    }

    if (fRole) list = list.filter((u) => String(u.role || '') === fRole)

    if (fActif !== 'all') {
      const want = fActif === '1'
      list = list.filter((u) => !!u.actif === want)
    }

    list.sort((a, b) => (b.id || 0) - (a.id || 0))
    return list
  }, [users, debouncedSearch, fRole, fActif])

  const total = filtered.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))

  useEffect(() => {
    setPage((p) => Math.min(p, lastPage))
  }, [lastPage])

  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page, perPage])

  const mCreate = useMutation({
  mutationFn: (vals: UserInput) => api.post('/users', vals),
  onSuccess: async (res) => {
    const created = res?.data?.data ?? res?.data

    if (created?.id) {
      qc.setQueryData(['users-all'], (old: any) => {
        const arr = Array.isArray(old) ? old : []
        return [created, ...arr.filter((u: any) => u?.id !== created.id)]
      })
    }

    await qc.invalidateQueries({ queryKey: ['users-all'], refetchType: 'active' })

    setFormOpen(false)
    setEditing(null)
    toast.push({ title: 'Utilisateur créé', tone: 'success' })
  },
})


const mUpdate = useMutation({
  mutationFn: (vals: UserInput) => api.put(`/users/${editing?.id}`, vals),
  onSuccess: async (res) => {
    const updated = res?.data?.data ?? res?.data

    if (updated?.id) {
      qc.setQueryData(['users-all'], (old: any) => {
        const arr = Array.isArray(old) ? old : []
        return arr.map((u: any) =>
          u?.id === updated.id ? { ...u, ...updated } : u
        )
      })

      // 🔄 si on modifie l'utilisateur connecté
      if (me?.id === updated.id) {
        await refreshMe()
      }
    }

    await qc.invalidateQueries({ queryKey: ['users-all'], refetchType: 'active' })

    setFormOpen(false)
    setEditing(null)
    toast.push({ title: 'Utilisateur mis à jour', tone: 'success' })
  },
})

  const mSetActif = useMutation({
    mutationFn: ({ id, actif }: { id: number; actif: boolean }) =>
      api.patch(`/users/${id}`, { actif: actif ? 1 : 0 }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users-all'] })
      toast.push({ title: 'Statut mis à jour', tone: 'success' })
    },
    onError: (e: any) =>
      toast.push({ title: e?.response?.data?.message || 'Action impossible', tone: 'error' }),
  })

  // ton backend “destroy” désactive (actif=0) => parfait
  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users-all'] })
      toast.push({ title: 'Utilisateur désactivé', tone: 'success' })
    },
    onError: (e: any) =>
      toast.push({ title: e?.response?.data?.message || 'Suppression impossible', tone: 'error' }),
  })

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (u: UserModel) => {
    setEditing(u)
    setFormOpen(true)
  }

  const openDetails = (u: UserModel) => {
    setSelected(u)
    setDetailsOpen(true)
  }

  const toDefaults = (u?: UserModel): Partial<UserInput> | undefined => {
    if (!u) return undefined
    return {
      prenom: u.prenom ?? '',
      nom: u.nom ?? '',
      email: u.email ?? '',
      role: (u.role as any) ?? 'employee',
      password: '',
    }
  }

  // ✅ affichage
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={18} /> Utilisateurs
          </h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {total} utilisateurs
          </div>
        </div>

        <button className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
          <Plus size={16} /> Nouvel utilisateur
        </button>
      </div>

      {/* Filters */}
      <FiltersBar>
        <div>
          <label className="label">Recherche</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              className="input pl-9"
              placeholder="Nom, email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>

        <div>
          <label className="label">Rôle</label>
          <select
            className="input"
            value={fRole}
            onChange={(e) => {
              setFRole(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Tous</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Actif</label>
          <select
            className="input"
            value={fActif}
            onChange={(e) => {
              setFActif(e.target.value as any)
              setPage(1)
            }}
          >
            <option value="1">Actifs</option>
            <option value="0">Inactifs</option>
            <option value="all">Tous</option>
          </select>
        </div>
      </FiltersBar>

      {/* Table */}
      {qUsers.isLoading ? (
        <p>Chargement…</p>
      ) : qUsers.isError ? (
        <div className="card">
          <div className="text-red-600 font-semibold">Impossible de charger les utilisateurs</div>
          <div className="text-sm text-gray-500 mt-1">
            Vérifie que tu es bien connecté en admin et que l’endpoint <span className="font-mono">/users</span> est actif.
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
          <T>
            <thead className="bg-gray-100/70 dark:bg-white/5">
              <tr>
                <Th>Utilisateur</Th>
                <Th className="hidden lg:table-cell">Rôle</Th>
                <Th className="hidden lg:table-cell">Actif</Th>
                <Th className="w-[64px]"></Th>
              </tr>
            </thead>

            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={4}>Aucun utilisateur</td>
                </tr>
              ) : (
                pageItems.map((u) => {
                  const isActive = !!u.actif
                  const fullName = `${u.prenom || ''} ${u.nom || ''}`.trim() || '—'

                  const actions = [
                    { label: 'Voir', icon: <Eye size={16} />, onClick: () => openDetails(u) },
                    {
                      label: 'Modifier',
                      icon: <Pencil size={16} />,
                      onClick: () => openEdit(u),
                    },
                    {
                      label: isActive ? 'Désactiver' : 'Activer',
                      icon: isActive ? <XCircle size={16} /> : <CheckCircle2 size={16} />,
                      onClick: () => mSetActif.mutate({ id: u.id, actif: !isActive }),
                      disabled: mSetActif.isPending,
                    },
                    {
                      label: 'Désactiver (Delete)',
                      icon: <Trash2 size={16} />,
                      tone: 'danger' as const,
                      onClick: () => setConfirmId(u.id),
                      disabled: mDelete.isPending,
                    },
                  ]

                  return (
                    <tr key={u.id} className="border-t border-black/5 dark:border-white/10">
                      <Td>
                        <div className="font-medium">{fullName}</div>
                        <div className="text-xs text-gray-500">{u.email || '—'}</div>

                        <div className="lg:hidden mt-2 flex flex-wrap gap-2">
                          <Badge tone={roleTone(u.role) as any}>{u.role || '—'}</Badge>
                          <Badge tone={isActive ? 'green' : 'red'}>{isActive ? 'Actif' : 'Inactif'}</Badge>
                        </div>
                      </Td>

                      <Td className="hidden lg:table-cell">
                        <Badge tone={roleTone(u.role) as any}>{u.role || '—'}</Badge>
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

      {/* Details */}
      <Modal
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false)
          setSelected(null)
        }}
        title="Détails utilisateur"
        widthClass="max-w-3xl"
      >
        {selected ? <UserDetails user={selected} /> : null}
      </Modal>

      {/* Form */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Modifier utilisateur' : 'Nouvel utilisateur'}
        widthClass="max-w-3xl"
      >
        <UsersForm
          defaultValues={toDefaults(editing ?? undefined)}
          onSubmit={(vals) => {
            if (editing && (vals.role || '') !== (editing.role || '')) {
                setConfirmRole({
                open: true,
                next: vals,
                oldRole: String(editing.role || ''),
                newRole: String(vals.role || ''),
                })
                return
            }
            editing ? mUpdate.mutate(vals) : mCreate.mutate(vals)
            }}

          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          submitting={mCreate.isPending || mUpdate.isPending}
        />
      </Modal>

      {/* Confirm “delete” (= désactiver) */}
      <ConfirmDialog
        open={confirmId !== null}
        title="Désactiver cet utilisateur ?"
        message="L’utilisateur sera désactivé (actif = 0)."
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId != null) mDelete.mutate(confirmId)
          setConfirmId(null)
        }}
      />

      <ConfirmDialog
        open={confirmRole.open}
        title="Confirmer le changement de rôle"
        message={`Rôle: ${confirmRole.oldRole} → ${confirmRole.newRole}. Continuer ?`}
        onCancel={() => setConfirmRole({ open: false })}
        onConfirm={() => {
            if (confirmRole.next) mUpdate.mutate(confirmRole.next)
            setConfirmRole({ open: false })
        }}
        />

    </div>
  )
}
