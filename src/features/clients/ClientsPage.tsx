// src/features/clients/ClientsPage.tsx
import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useDebouncedValue, normalizePaged } from '../../lib/helpers'
import Modal from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { FiltersBar } from '../../ui/FiltersBar'
import { Pagination } from '../../ui/Pagination'
import { T, Th, Td } from '../../ui/Table'
import { useToast } from '../../ui/Toasts'
import { ActionsMenu } from '../../ui/ActionsMenu'
import ClientDetails from './ClientDetails'
import ClientsForm from './ClientsForm'
import { SkeletonTable } from '../../ui/Skeleton'
import {
  Plus, Search, Eye, Pencil, Trash2, X, Upload, Users,
  Phone, Mail, Globe, Loader2, Download, UserCheck, UserPlus,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initialsFromClient(c: any) {
  const a = String(c?.prenom || '').trim()
  const b = String(c?.nom || '').trim()
  const s = `${a} ${b}`.trim() || String(c?.nom || '').trim() || 'CL'
  const parts = s.split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? 'C'}${parts[1]?.[0] ?? parts[0]?.[1] ?? 'L'}`.toUpperCase()
}

function displayClientName(c: any) {
  return [c?.prenom, c?.nom].filter(Boolean).join(' ').trim() || c?.nom || `Client #${c?.id ?? '—'}`
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, accent, iconBg,
}: {
  label: string; value: React.ReactNode; sub?: string
  icon: React.ReactNode; accent: string; iconBg: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 dark:border-white/[0.08] bg-white dark:bg-[#151d2e] shadow-sm">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accent}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</div>
            <div className="mt-1.5 text-xl font-bold text-gray-900 dark:text-gray-50">{value}</div>
            {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tone Badge ───────────────────────────────────────────────────────────────

function ToneBadge({ tone, children }: { tone: 'gray' | 'blue' | 'green' | 'amber'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    blue:  'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    gray:  'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200',
  }[tone]
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>{children}</span>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Client = any

export default function ClientsPage() {
  const qc    = useQueryClient()
  const toast = useToast()

  const [page, setPage]           = useState(1)
  const perPage                   = 10
  const [search, setSearch]       = useState('')
  const debouncedSearch            = useDebouncedValue(search, 300)
  const [sort, setSort]           = useState<'recent' | 'alpha'>('recent')
  const [exporting, setExporting] = useState(false)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [viewing, setViewing]         = useState<Client | null>(null)
  const [formOpen, setFormOpen]       = useState(false)
  const [editing, setEditing]         = useState<Client | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id?: number; name?: string }>({ open: false })

  // ── Query ───────────────────────────────────────────────────────────────────

  const q = useQuery({
    queryKey: ['clients', { page, perPage, search: debouncedSearch, sort }] as const,
    queryFn: async () => {
      const { data } = await api.get('/clients', {
        params: { page, per_page: perPage, search: debouncedSearch || undefined, sort },
      })
      return data
    },
    placeholderData: keepPreviousData,
  })

  // KPI: fetch page 1 with no filter to get total count
  const qTotal = useQuery({
    queryKey: ['clients-total'],
    queryFn: async () => {
      const { data } = await api.get('/clients', { params: { page: 1, per_page: 1 } })
      return normalizePaged(data).total ?? 0
    },
    staleTime: 60_000,
  })

  const paged = useMemo(() => normalizePaged(q.data), [q.data])
  const rows: Client[] = useMemo(() => paged.items ?? [], [paged.items])
  const totalAll = Number(qTotal.data ?? 0)
  const totalFiltered = Number(paged.total || 0)

  // new this month (approximation from current page if no stats endpoint)
  const newThisMonth = useMemo(() => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0)
    return rows.filter((c) => {
      const d = new Date(c?.created_at || 0)
      return d >= start
    }).length
  }, [rows])

  useEffect(() => {
    if (!q.isFetching && paged.lastPage && page > paged.lastPage) setPage(paged.lastPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paged.lastPage, q.isFetching])

  // ── Mutations ───────────────────────────────────────────────────────────────

  const mCreate = useMutation({
    mutationFn: async (vals: any) => { const r = await api.post('/clients', vals); return r.data?.data ?? r.data },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); qc.invalidateQueries({ queryKey: ['clients-total'] }); setFormOpen(false); setEditing(null); toast.push({ title: 'Client créé', tone: 'success' }) },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur création', tone: 'error' }),
  })

  const mUpdate = useMutation({
    mutationFn: async (vals: any) => { if (!editing?.id) throw new Error('ID manquant'); const r = await api.patch(`/clients/${editing.id}`, vals); return r.data?.data ?? r.data },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setFormOpen(false); setEditing(null); toast.push({ title: 'Client mis à jour', tone: 'success' }) },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur mise à jour', tone: 'error' }),
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/clients/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); qc.invalidateQueries({ queryKey: ['clients-total'] }); toast.push({ title: 'Client supprimé', tone: 'success' }) },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur suppression', tone: 'error' }),
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mImport = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData(); form.append('file', file)
      const { data } = await api.post('/clients/import-excel', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['clients'] }); qc.invalidateQueries({ queryKey: ['clients-total'] })
      const ins = data?.inserted_or_updated ?? 0, skp = data?.skipped ?? 0, err = data?.errors_count ?? 0
      toast.push({ title: 'Import terminé', tone: err > 0 ? 'warning' : 'success', description: `${ins} ajouté(s), ${skp} ignoré(s)${err > 0 ? `, ${err} erreur(s)` : ''}` })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || "Erreur import", tone: 'error' }),
  })

  const isPending = mCreate.isPending || mUpdate.isPending || mDelete.isPending || mImport.isPending

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openCreate  = () => { setEditing(null); setFormOpen(true) }
  const openEdit    = (c: any) => { setEditing(c); setFormOpen(true) }
  const openDetails = (c: any) => { setViewing(c); setDetailsOpen(true) }
  const askDelete   = (id: number, name: string) => setConfirmDelete({ open: true, id, name })
  const doDelete    = () => { if (confirmDelete.id) mDelete.mutate(confirmDelete.id); setConfirmDelete({ open: false }) }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api.get('/clients/export', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a   = document.createElement('a')
      a.href    = url
      a.download = `clients-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.push({ title: 'Export téléchargé', tone: 'success' })
    } catch {
      toast.push({ title: 'Export non disponible', tone: 'error' })
    } finally {
      setExporting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
            <Users size={16} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">Clients</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
              {totalAll > 0 ? `${totalAll} client${totalAll > 1 ? 's' : ''}` : 'Aucun client'}
              {debouncedSearch && <span className="ml-1.5 text-amber-500 font-medium">· Filtre actif</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) mImport.mutate(f); e.target.value = '' }}
          />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors whitespace-nowrap"
            onClick={() => fileInputRef.current?.click()}
            disabled={mImport.isPending}
            title="Importer depuis Excel"
          >
            {mImport.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Import
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors whitespace-nowrap"
            onClick={handleExport}
            disabled={exporting}
            title="Exporter en Excel"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export
          </button>
          <button
            type="button"
            className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition shadow-sm"
            onClick={openCreate}
          >
            <Plus size={15} /> Nouveau client
          </button>
        </div>
      </div>

      {/* ── KPI Cards (compact 1-line) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/15">
              <Users size={14} className="text-sky-600 dark:text-sky-400" />
            </div>
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide truncate">
              Total clients
            </div>
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {totalAll > 0 ? totalAll : (q.isLoading ? '…' : totalFiltered)}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15">
              <Search size={14} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide truncate">
              {debouncedSearch ? 'Résultats' : 'Page actuelle'}
            </div>
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {debouncedSearch ? totalFiltered : rows.length}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/15">
              <UserPlus size={14} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide truncate">
              Nouveaux ce mois
            </div>
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {newThisMonth}
          </div>
        </div>
      </div>

      {/* ── Filtres ── */}
      <FiltersBar>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-3 w-full">
          <div>
            <label className="label flex items-center gap-1.5">
              Recherche
              {q.isFetching && !q.isLoading && <Loader2 size={12} className="animate-spin text-gray-400" />}
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input !pl-9 pr-10"
                placeholder="Nom, email, téléphone…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
              {search && (
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 btn px-2 bg-gray-200 dark:bg-white/10" onClick={() => { setSearch(''); setPage(1) }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="label">Trier</label>
            <select className="input" value={sort} onChange={(e) => { setSort(e.target.value as any); setPage(1) }}>
              <option value="recent">Plus récents</option>
              <option value="alpha">A → Z</option>
            </select>
          </div>
        </div>
      </FiltersBar>

      {/* ── Liste ── */}
      <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
        {/* List header */}
        <div className="hidden sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_72px] md:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_72px] items-center gap-3 px-4 py-2 border-b border-black/[0.04] dark:border-white/[0.05] bg-gray-50/80 dark:bg-white/[0.02]">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">Client</span>
          <span className="hidden md:inline text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Email</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Téléphone</span>
          <span className="hidden md:inline text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Pays</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Actions</span>
        </div>

        {q.isLoading ? (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="h-7 w-7 rounded-full bg-black/[0.06] dark:bg-white/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 h-3 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-32 rounded bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
        ) : q.isError ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-5">
            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-3">
              <Users size={20} className="text-red-400" />
            </div>
            <div className="text-sm font-semibold text-gray-500">Erreur lors du chargement des clients</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
              <Users size={22} className="text-gray-300 dark:text-gray-600" />
            </div>
            <div className="text-base font-semibold text-gray-500 dark:text-gray-400">Aucun client trouvé</div>
            <div className="text-sm text-gray-400 dark:text-gray-600 mt-1 mb-4">
              {debouncedSearch ? 'Essayez un autre mot-clé' : 'Ajoutez votre premier client'}
            </div>
            {!debouncedSearch && (
              <button
                onClick={openCreate}
                className="inline-flex whitespace-nowrap items-center gap-2 rounded-lg bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition"
              >
                <Plus size={15} /> Nouveau client
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {rows.map((c: any) => {
              const name     = displayClientName(c)
              const initials = initialsFromClient(c)
              const actions  = [
                { label: 'Voir',      icon: <Eye size={15} />,    onClick: () => openDetails(c) },
                { label: 'Modifier',  icon: <Pencil size={15} />, onClick: () => openEdit(c) },
                { label: 'Supprimer', icon: <Trash2 size={15} />, tone: 'danger' as const, onClick: () => askDelete(c.id, name), disabled: isPending },
              ]

              return (
                <div
                  key={c.id}
                  onClick={() => openDetails(c)}
                  className="group flex flex-col sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_72px] md:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_72px] sm:items-center gap-1 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-2 hover:bg-gray-50/80 dark:hover:bg-white/[0.025] transition-colors cursor-pointer"
                >
                  {/* Cell 1 : Avatar + nom (+ actions inline sur mobile) */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 text-[10px] font-bold">
                      {initials}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0" title={name}>{name}</span>
                    {/* Actions sur mobile */}
                    <div onClick={(e) => e.stopPropagation()} className="flex sm:hidden shrink-0 -mr-1">
                      <ActionsMenu items={actions} />
                    </div>
                  </div>

                  {/* Cell 2 : Email (md+) */}
                  <div className="hidden md:flex items-center justify-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 min-w-0">
                    {c?.email ? (
                      <>
                        <Mail size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate" title={c.email}>{c.email}</span>
                      </>
                    ) : <span className="text-gray-400">—</span>}
                  </div>

                  {/* Cell 3 : Téléphone (sm+) */}
                  <div className="hidden sm:flex items-center justify-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                    {c?.telephone ? (
                      <>
                        <Phone size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate" title={c.telephone}>{c.telephone}</span>
                      </>
                    ) : <span className="text-gray-400">—</span>}
                  </div>

                  {/* Cell 4 : Pays (md+) */}
                  <div className="hidden md:flex items-center justify-center">
                    {c?.pays ? <ToneBadge tone="gray">{c.pays}</ToneBadge> : <span className="text-gray-400 text-sm">—</span>}
                  </div>

                  {/* Mobile summary (xs only) */}
                  <div className="flex sm:hidden flex-wrap items-center gap-x-3 gap-y-0.5 pl-9 text-xs text-gray-500 dark:text-gray-400">
                    {c?.telephone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {c.telephone}</span>}
                    {c?.email     && <span className="inline-flex items-center gap-1 min-w-0"><Mail size={11} /><span className="truncate max-w-[180px]">{c.email}</span></span>}
                    {c?.pays      && <span className="inline-flex items-center gap-1"><Globe size={11} /> {c.pays}</span>}
                  </div>

                  {/* Cell 5 : Actions (sm+) */}
                  <div onClick={(e) => e.stopPropagation()} className="hidden sm:flex justify-center">
                    <ActionsMenu items={actions} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Pagination page={paged.page} lastPage={paged.lastPage} total={paged.total} perPage={perPage} onPage={setPage} />

      {/* ── Modals ── */}
      <Modal open={detailsOpen} onClose={() => { setDetailsOpen(false); setViewing(null) }} title="Fiche client" widthClass="max-w-4xl">
        {viewing
          ? <ClientDetails client={viewing} onClose={() => { setDetailsOpen(false); setViewing(null) }} onEdit={() => { setDetailsOpen(false); openEdit(viewing) }} />
          : <div className="py-4 text-sm text-gray-500">Aucune donnée.</div>
        }
      </Modal>

      <Modal open={formOpen} onClose={() => { setFormOpen(false); setEditing(null) }} title={editing ? 'Modifier client' : 'Nouveau client'} widthClass="max-w-2xl">
        <ClientsForm
          defaultValues={editing ?? undefined}
          submitting={mCreate.isPending || mUpdate.isPending}
          onCancel={() => { setFormOpen(false); setEditing(null) }}
          onSubmit={(vals: any) => { if (editing?.id) mUpdate.mutate(vals); else mCreate.mutate(vals) }}
        />
      </Modal>

      <ConfirmDialog
        open={confirmDelete.open}
        onCancel={() => setConfirmDelete({ open: false })}
        onConfirm={doDelete}
        title="Supprimer ce client ?"
        message="Cette action est irréversible."
        itemName={confirmDelete.name}
      />
    </div>
  )
}
