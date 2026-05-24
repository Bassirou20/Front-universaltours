import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/axios'
import { useDebouncedValue, fetchAllPaged } from '../../lib/helpers'
import type { LaravelPage } from '../../types/models'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { T, Th, Td } from '../../ui/Table'
import { Pagination } from '../../ui/Pagination'
import { FiltersBar } from '../../ui/FiltersBar'
import { useToast } from '../../ui/Toasts'
import { useAuth } from '../../store/auth'
import { Badge } from '../../ui/Badge'
import { ActionsMenu } from '../../ui/ActionsMenu'
import { Eye, Pencil, Trash2, Plus, Search, CheckCircle2, XCircle, Users, Shield, Loader2, KeyRound, Copy, Clock, Download, CheckSquare, Square, X, FileSpreadsheet } from 'lucide-react'
import { SkeletonTable } from '../../ui/Skeleton'
import UsersForm, { type UserInput } from './UsersForm'
import UserDetails, { type UserModel } from './UserDetails'

async function fetchUsers(): Promise<UserModel[]> {
  const res = await api.get('/users', { params: { page: 1, per_page: 100 } })
  const data = res.data
  if (Array.isArray(data)) return data as UserModel[]
  if (Array.isArray(data?.data)) {
    const all = await fetchAllPaged<UserModel>('/users')
    return all.length ? all : (data.data as UserModel[])
  }
  return []
}

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ')
}

const roleTone = (role?: string | null) => {
  const r = String(role || '').toLowerCase()
  if (r.includes('admin')) return 'purple'
  if (r.includes('employee') || r.includes('agent')) return 'blue'
  return 'gray'
}

function initialsFromUser(u: any) {
  const a = String(u?.prenom || '').trim()
  const b = String(u?.nom || '').trim()
  const s = `${a} ${b}`.trim() || String(u?.email || '').trim() || 'UT'
  const parts = s.split(/\s+/).filter(Boolean)
  const i1 = parts[0]?.[0] ?? 'U'
  const i2 = parts[1]?.[0] ?? parts[0]?.[1] ?? 'T'
  return `${i1}${i2}`.toUpperCase()
}

function displayUserName(u: any) {
  return `${u?.prenom || ''} ${u?.nom || ''}`.trim() || u?.nom || `User #${u?.id ?? '—'}`
}

function relativeLogin(iso?: string | null): string {
  if (!iso) return 'Jamais connecté'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'Jamais connecté'
  const diffSec = Math.floor((Date.now() - t) / 1000)
  if (diffSec < 60) return 'Connecté à l\'instant'
  if (diffSec < 3600) return `Connecté il y a ${Math.floor(diffSec / 60)} min`
  if (diffSec < 86400) return `Connecté il y a ${Math.floor(diffSec / 3600)} h`
  if (diffSec < 604800) return `Connecté il y a ${Math.floor(diffSec / 86400)} j`
  return 'Connecté le ' + new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function UsersPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const { user: me, refreshMe } = useAuth()
  const isAdmin = String(me?.role || '').toLowerCase() === 'admin'

  // ✅ Interdire complètement l'accès aux non-admin
  useEffect(() => {
    if (me && !isAdmin) navigate('/dashboard', { replace: true })
  }, [me, isAdmin, navigate])

  if (me && !isAdmin) return null

  const [page, setPage] = useState(1)
  const perPage = 10

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [fRole, setFRole] = useState('')
  const [fActif, setFActif] = useState<'all' | '1' | '0'>('1')
  const [fDateFrom, setFDateFrom] = useState('')
  const [fDateTo, setFDateTo] = useState('')

  // Sélection multiple (bulk actions)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editing, setEditing] = useState<UserModel | null>(null)
  const [selected, setSelected] = useState<UserModel | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [confirmName, setConfirmName] = useState<string | undefined>(undefined)

  const [confirmRole, setConfirmRole] = useState<{
    open: boolean
    next?: UserInput
    oldRole?: string
    newRole?: string
  }>({ open: false })

  // Reset password : modal d'affichage du mot de passe temporaire généré
  const [resetResult, setResetResult] = useState<{
    open: boolean
    userName?: string
    tempPassword?: string
  }>({ open: false })
  const [confirmReset, setConfirmReset] = useState<{ userId?: number; userName?: string }>({})

  const qUsers = useQuery({
    queryKey: ['users-all'],
    queryFn: fetchUsers,
    staleTime: 30_000,
    retry: false,
    enabled: !!me && isAdmin,
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

    // Filtre par date de création
    if (fDateFrom) {
      const from = new Date(fDateFrom).getTime()
      list = list.filter((u) => {
        const t = new Date(u.created_at || 0).getTime()
        return !Number.isNaN(t) && t >= from
      })
    }
    if (fDateTo) {
      const to = new Date(fDateTo).getTime() + 24 * 60 * 60 * 1000 - 1 // fin de journée
      list = list.filter((u) => {
        const t = new Date(u.created_at || 0).getTime()
        return !Number.isNaN(t) && t <= to
      })
    }

    list.sort((a, b) => (b.id || 0) - (a.id || 0))
    return list
  }, [users, debouncedSearch, fRole, fActif, fDateFrom, fDateTo])

  const total = filtered.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))

  useEffect(() => {
    setPage((p) => Math.min(p, lastPage))
  }, [lastPage])

  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page])

  // ── Sélection : helpers ──
  const selectableIds = useMemo(
    () => pageItems.filter((u) => u.id !== me?.id).map((u) => u.id),
    [pageItems, me?.id]
  )
  const allPageSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id))
  const somePageSelected = selectableIds.some((id) => selectedIds.has(id)) && !allPageSelected

  const togglePageSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        selectableIds.forEach((id) => next.delete(id))
      } else {
        selectableIds.forEach((id) => next.add(id))
      }
      return next
    })
  }
  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const clearSelection = () => setSelectedIds(new Set())

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
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur création utilisateur', tone: 'error' }),
  })

  const mUpdate = useMutation({
    mutationFn: (vals: UserInput) => api.put(`/users/${editing?.id}`, vals),
    onSuccess: async (res) => {
      const updated = res?.data?.data ?? res?.data
      if (updated?.id) {
        qc.setQueryData(['users-all'], (old: any) => {
          const arr = Array.isArray(old) ? old : []
          return arr.map((u: any) => (u?.id === updated.id ? { ...u, ...updated } : u))
        })
        if (me?.id === updated.id) await refreshMe()
      }
      await qc.invalidateQueries({ queryKey: ['users-all'], refetchType: 'active' })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Utilisateur mis à jour', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur update utilisateur', tone: 'error' }),
  })

  const mSetActif = useMutation({
    mutationFn: ({ id, actif }: { id: number; actif: boolean }) => api.patch(`/users/${id}`, { actif: actif ? 1 : 0 }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users-all'] })
      toast.push({ title: 'Statut mis à jour', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Action impossible', tone: 'error' }),
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users-all'] })
      toast.push({ title: 'Utilisateur désactivé', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Suppression impossible', tone: 'error' }),
  })

  const mResetPwd = useMutation({
    mutationFn: (id: number) => api.post(`/users/${id}/reset-password`),
    onSuccess: (res: any, _id) => {
      const data = res?.data
      if (data?.temp_password) {
        const userName = confirmReset.userName || ''
        setResetResult({ open: true, userName, tempPassword: data.temp_password })
        toast.push({ title: 'Mot de passe réinitialisé ✓', tone: 'success' })
      }
      setConfirmReset({})
    },
    onError: (e: any) => {
      toast.push({ title: e?.response?.data?.message || 'Réinitialisation impossible', tone: 'error' })
      setConfirmReset({})
    },
  })

  // Bulk actions : activer/désactiver plusieurs users à la fois
  const mBulk = useMutation({
    mutationFn: ({ action, ids }: { action: 'activate' | 'deactivate'; ids: number[] }) =>
      api.post('/users/bulk', { action, ids }),
    onSuccess: async (res: any) => {
      await qc.invalidateQueries({ queryKey: ['users-all'] })
      toast.push({ title: res?.data?.message || 'Action effectuée ✓', tone: 'success' })
      setSelectedIds(new Set())
    },
    onError: (e: any) => {
      toast.push({ title: e?.response?.data?.message || 'Action impossible', tone: 'error' })
    },
  })

  // Export CSV : déclenche un téléchargement
  const [exporting, setExporting] = useState(false)
  const exportCSV = async (idsOnly?: number[]) => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (idsOnly && idsOnly.length > 0) {
        idsOnly.forEach((id) => params.append('ids[]', String(id)))
      } else {
        if (debouncedSearch) params.append('q', debouncedSearch)
        if (fRole) params.append('role', fRole)
        if (fActif !== 'all') params.append('actif', fActif)
        if (fDateFrom) params.append('date_from', fDateFrom)
        if (fDateTo) params.append('date_to', fDateTo)
      }
      const res = await api.get(`/users/export?${params.toString()}`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const date = new Date().toISOString().slice(0, 10)
      link.download = `utilisateurs_${date}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.push({ title: 'Export téléchargé ✓', tone: 'success' })
    } catch (e: any) {
      toast.push({ title: e?.response?.data?.message || 'Erreur export', tone: 'error' })
    } finally {
      setExporting(false)
    }
  }

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

  const toDefaults = (u?: UserModel | null): Partial<UserInput> | undefined => {
    if (!u) return undefined
    return {
      prenom: u.prenom ?? '',
      nom: u.nom ?? '',
      email: u.email ?? '',
      role: (u.role as any) ?? 'employee',
      password: '',
    }
  }

  const headerBadges = (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge tone="gray">{total} utilisateur{total > 1 ? 's' : ''}</Badge>
      {debouncedSearch ? <Badge tone="blue">Filtre: "{debouncedSearch}"</Badge> : null}
      {fRole ? <Badge tone={roleTone(fRole) as any}>{fRole}</Badge> : null}
      <Badge tone={fActif === 'all' ? 'amber' : fActif === '1' ? 'green' : 'red'}>
        {fActif === 'all' ? 'Tous' : fActif === '1' ? 'Actifs' : 'Inactifs'}
      </Badge>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400">
            <Shield size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">Utilisateurs</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight truncate">
              {total} utilisateur{total > 1 ? 's' : ''} (admin-only)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => exportCSV()}
            disabled={exporting || total === 0}
            className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition disabled:opacity-40"
            title="Exporter au format CSV"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            Exporter
          </button>
          <button
            type="button"
            className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition shadow-sm"
            onClick={openCreate}
          >
            <Plus size={15} /> Nouvel utilisateur
          </button>
        </div>
      </div>

      {headerBadges && <div>{headerBadges}</div>}

      {/* Filters */}
      <FiltersBar>
        <div>
          <label className="label flex items-center gap-1.5">
            Recherche
            {qUsers.isFetching && !qUsers.isLoading && <Loader2 size={12} className="animate-spin text-gray-400" />}
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              className="input !pl-9"
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
              <option key={r} value={r}>
                {r}
              </option>
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

        <div>
          <label className="label">Créé depuis</label>
          <input
            type="date"
            className="input"
            value={fDateFrom}
            onChange={(e) => { setFDateFrom(e.target.value); setPage(1) }}
          />
        </div>

        <div>
          <label className="label">Créé jusqu'au</label>
          <input
            type="date"
            className="input"
            value={fDateTo}
            onChange={(e) => { setFDateTo(e.target.value); setPage(1) }}
          />
        </div>
      </FiltersBar>

      {/* Liste */}
      <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
        {/* List header */}
        <div className="hidden sm:grid sm:grid-cols-[32px_minmax(0,2fr)_minmax(0,1fr)_72px] md:grid-cols-[32px_minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1fr)_72px] items-center gap-3 px-4 py-2 border-b border-black/[0.04] dark:border-white/[0.05] bg-gray-50/80 dark:bg-white/[0.02]">
          {/* Checkbox header */}
          <button
            type="button"
            onClick={togglePageSelection}
            disabled={selectableIds.length === 0}
            className="flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition disabled:opacity-30"
            title={allPageSelected ? 'Tout désélectionner' : 'Tout sélectionner sur cette page'}
          >
            {allPageSelected ? (
              <CheckSquare size={15} className="text-[var(--ut-orange)]" />
            ) : somePageSelected ? (
              <div className="w-[15px] h-[15px] rounded border-2 border-[var(--ut-orange)] bg-[var(--ut-orange)]/30 flex items-center justify-center">
                <div className="w-1.5 h-0.5 bg-[var(--ut-orange)]" />
              </div>
            ) : (
              <Square size={15} />
            )}
          </button>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">Utilisateur</span>
          <span className="hidden md:inline text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Rôle</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Statut</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Actions</span>
        </div>

        {qUsers.isLoading ? (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="h-7 w-7 rounded-full bg-black/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 h-3 rounded bg-black/[0.06] animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-black/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
        ) : qUsers.isError ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-5">
            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-3">
              <Shield size={20} className="text-red-400" />
            </div>
            <div className="text-sm font-semibold text-gray-500">Impossible de charger les utilisateurs</div>
            <div className="text-xs text-gray-400 mt-1">Connecte-toi en admin et vérifie l'endpoint <span className="font-mono">/users</span>.</div>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
              <Shield size={22} className="text-gray-300 dark:text-gray-600" />
            </div>
            <div className="text-base font-semibold text-gray-500 dark:text-gray-400">Aucun utilisateur</div>
            <button
              onClick={openCreate}
              className="mt-4 inline-flex whitespace-nowrap items-center gap-2 rounded-lg bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition"
            >
              <Plus size={15} /> Nouvel utilisateur
            </button>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {pageItems.map((u) => {
              const isActive = !!u.actif
              const fullName = displayUserName(u)
              const userInitials = initialsFromUser(u)

              const isSelf = me?.id === u.id
              const actions = [
                { label: 'Voir', icon: <Eye size={15} />, onClick: () => openDetails(u) },
                { label: 'Modifier', icon: <Pencil size={15} />, onClick: () => openEdit(u) },
                {
                  label: 'Réinitialiser le mot de passe',
                  icon: <KeyRound size={15} />,
                  onClick: () => setConfirmReset({ userId: u.id, userName: displayUserName(u) }),
                  disabled: isSelf || mResetPwd.isPending,
                },
                {
                  label: isActive ? 'Désactiver' : 'Activer',
                  icon: isActive ? <XCircle size={15} /> : <CheckCircle2 size={15} />,
                  onClick: () => mSetActif.mutate({ id: u.id, actif: !isActive }),
                  disabled: isSelf || mSetActif.isPending,
                },
                {
                  label: 'Supprimer',
                  icon: <Trash2 size={15} />,
                  tone: 'danger' as const,
                  onClick: () => { setConfirmId(u.id); setConfirmName(displayUserName(u)) },
                  disabled: isSelf || mDelete.isPending,
                },
              ]

              const isSelected = selectedIds.has(u.id)
              const canSelect = u.id !== me?.id

              return (
                <div
                  key={u.id}
                  className={cx(
                    'group flex flex-col sm:grid sm:grid-cols-[32px_minmax(0,2fr)_minmax(0,1fr)_72px] md:grid-cols-[32px_minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1fr)_72px] sm:items-center gap-1 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-2 transition-colors',
                    isSelected
                      ? 'bg-[var(--ut-orange)]/[0.06] hover:bg-[var(--ut-orange)]/[0.10]'
                      : 'hover:bg-gray-50/80 dark:hover:bg-white/[0.025]'
                  )}
                >
                  {/* Cell 0 : Checkbox sélection */}
                  <button
                    type="button"
                    onClick={() => canSelect && toggleOne(u.id)}
                    disabled={!canSelect}
                    className="hidden sm:flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition disabled:opacity-20 disabled:cursor-not-allowed"
                    title={!canSelect ? 'Votre compte ne peut pas être sélectionné' : isSelected ? 'Désélectionner' : 'Sélectionner'}
                  >
                    {isSelected ? (
                      <CheckSquare size={15} className="text-[var(--ut-orange)]" />
                    ) : (
                      <Square size={15} />
                    )}
                  </button>

                  {/* Cell 1 : Avatar + nom + email + dernière connexion */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">
                      {userInitials}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={fullName}>{fullName}</span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate hidden lg:inline" title={u.email ?? undefined}>
                          · {u.email || '—'}
                        </span>
                      </div>
                      {(u as any).last_login_at && (
                        <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          <Clock size={9} />
                          {relativeLogin((u as any).last_login_at)}
                        </div>
                      )}
                    </div>
                    {/* Actions mobile */}
                    <div onClick={(e) => e.stopPropagation()} className="flex sm:hidden shrink-0 -mr-1">
                      <ActionsMenu items={actions} />
                    </div>
                  </div>

                  {/* Cell 2 : Rôle (md+) */}
                  <div className="hidden md:flex items-center justify-center">
                    <Badge tone={roleTone(u.role) as any}>{u.role || '—'}</Badge>
                  </div>

                  {/* Cell 3 : Statut (sm+) */}
                  <div className="hidden sm:flex items-center justify-center">
                    <Badge tone={isActive ? 'green' : 'red'}>{isActive ? 'Actif' : 'Inactif'}</Badge>
                  </div>

                  {/* Mobile summary */}
                  <div className="flex sm:hidden flex-wrap items-center gap-1.5 pl-9">
                    <Badge tone={roleTone(u.role) as any}>{u.role || '—'}</Badge>
                    <Badge tone={isActive ? 'green' : 'red'}>{isActive ? 'Actif' : 'Inactif'}</Badge>
                    {(u as any).last_login_at && (
                      <span className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                        <Clock size={9} />
                        {relativeLogin((u as any).last_login_at)}
                      </span>
                    )}
                    {u.email && <span className="text-[10px] text-gray-400 truncate max-w-[180px]">{u.email}</span>}
                  </div>

                  {/* Cell 4 : Actions (sm+) */}
                  <div className="hidden sm:flex justify-center">
                    <ActionsMenu items={actions} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Pagination page={page} lastPage={lastPage} total={total} perPage={perPage} onPage={setPage} />

      {/* ── Barre flottante d'actions groupées ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-2xl border border-black/20 dark:border-white/20">
          <div className="flex items-center gap-2 px-2 text-sm font-medium">
            <CheckSquare size={14} className="text-[var(--ut-orange)]" />
            <span>{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
          </div>

          <div className="w-px h-5 bg-white/20 dark:bg-gray-900/20" />

          <button
            type="button"
            onClick={() => mBulk.mutate({ action: 'activate', ids: Array.from(selectedIds) })}
            disabled={mBulk.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white/10 dark:hover:bg-gray-900/10 transition disabled:opacity-40"
          >
            <CheckCircle2 size={13} className="text-emerald-400 dark:text-emerald-600" />
            Activer
          </button>

          <button
            type="button"
            onClick={() => mBulk.mutate({ action: 'deactivate', ids: Array.from(selectedIds) })}
            disabled={mBulk.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white/10 dark:hover:bg-gray-900/10 transition disabled:opacity-40"
          >
            <XCircle size={13} className="text-rose-400 dark:text-rose-600" />
            Désactiver
          </button>

          <button
            type="button"
            onClick={() => exportCSV(Array.from(selectedIds))}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white/10 dark:hover:bg-gray-900/10 transition disabled:opacity-40"
          >
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Exporter
          </button>

          <div className="w-px h-5 bg-white/20 dark:bg-gray-900/20" />

          <button
            type="button"
            onClick={clearSelection}
            className="p-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-gray-900/10 transition"
            title="Annuler la sélection"
          >
            <X size={14} />
          </button>
        </div>
      )}

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
        {/* ✅ SAFE même si Modal garde le contenu monté */}
        <UserDetails user={selected} />
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
          isEdit={!!editing}
          defaultValues={toDefaults(editing)}
          onSubmit={(vals: UserInput) => {
            if (editing && String(vals.role || '') !== String(editing.role || '')) {
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

      {/* Confirm "delete" (= désactiver) */}
      <ConfirmDialog
        open={confirmId !== null}
        title="Désactiver cet utilisateur ?"
        message="L'utilisateur sera désactivé (actif = 0)."
        itemName={confirmName}
        onCancel={() => { setConfirmId(null); setConfirmName(undefined) }}
        onConfirm={() => {
          if (confirmId != null) mDelete.mutate(confirmId)
          setConfirmId(null)
          setConfirmName(undefined)
        }}
      />

      {/* Confirm role change */}
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

      {/* Confirm reset password */}
      <ConfirmDialog
        open={!!confirmReset.userId}
        title="Réinitialiser le mot de passe ?"
        message={`Un nouveau mot de passe temporaire sera généré pour ${confirmReset.userName || 'cet utilisateur'}. L'utilisateur devra le changer à sa prochaine connexion.`}
        onCancel={() => setConfirmReset({})}
        onConfirm={() => {
          if (confirmReset.userId) mResetPwd.mutate(confirmReset.userId)
        }}
      />

      {/* Display generated temp password */}
      <Modal
        open={resetResult.open}
        onClose={() => setResetResult({ open: false })}
        title="Mot de passe temporaire généré"
        widthClass="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Voici le mot de passe temporaire pour <strong>{resetResult.userName}</strong>.
            Transmettez-le par un canal sécurisé (téléphone, WhatsApp). Il ne sera <strong>plus jamais affiché</strong>.
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-white/[0.06] text-base font-mono font-bold text-gray-900 dark:text-gray-100 tracking-wider text-center select-all">
              {resetResult.tempPassword}
            </code>
            <button
              type="button"
              onClick={() => {
                if (resetResult.tempPassword) {
                  navigator.clipboard?.writeText(resetResult.tempPassword)
                  toast.push({ title: 'Copié dans le presse-papier', tone: 'success' })
                }
              }}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:opacity-90 transition"
              title="Copier"
            >
              <Copy size={14} />
              Copier
            </button>
          </div>

          <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2">
            ⚠️ Tous les tokens de connexion de cet utilisateur ont été révoqués. Il devra se reconnecter avec ce mot de passe puis en choisir un nouveau.
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setResetResult({ open: false })}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
