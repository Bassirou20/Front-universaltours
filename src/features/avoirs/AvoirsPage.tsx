import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../../lib/axios'
import { useDebouncedValue, normalizePaged, money } from '../../lib/helpers'
import { useToast } from '../../ui/Toasts'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import Modal from '../../ui/Modal'
import { Pagination } from '../../ui/Pagination'
import { T, Th, Td } from '../../ui/Table'
import { Badge } from '../../ui/Badge'
import { useAuth } from '../../store/auth'
import { FiltersBar } from '../../ui/FiltersBar'
import {
  Wallet, Trash2, ArrowDownToLine, ArrowUpFromLine,
  Search, Loader2, TrendingUp, ChevronDown, X as XIcon, User,
} from 'lucide-react'
import { SkeletonTable } from '../../ui/Skeleton'

// ─── Types ───────────────────────────────────────────────────────────────────

type Avoir = {
  id: number
  client_id: number
  user_id?: number | null
  facture_id?: number | null
  type: 'depot' | 'utilisation'
  montant: number
  solde_apres: number
  reference?: string | null
  notes?: string | null
  date_avoir?: string | null
  created_at?: string
  client?: { id: number; prenom?: string | null; nom?: string | null; email?: string | null }
  user?: { id: number; name: string }
  facture?: { id: number; numero?: string | null }
}

type ClientOption = { id: number; nom?: string | null; prenom?: string | null; email?: string | null }

// ─── Schemas ─────────────────────────────────────────────────────────────────

const depotSchema = z.object({
  client_id: z.coerce.number().int().positive('Sélectionnez un client'),
  montant: z.coerce.number().positive('Montant requis (> 0)'),
  reference: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  date_avoir: z.string().optional(),
})

const utilisationSchema = z.object({
  client_id: z.coerce.number().int().positive('Sélectionnez un client'),
  montant: z.coerce.number().positive('Montant requis (> 0)'),
  facture_id: z.coerce.number().int().positive().optional().or(z.literal('')),
  reference: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  date_avoir: z.string().optional(),
})

type DepotInput = z.infer<typeof depotSchema>
type UtilisationInput = z.infer<typeof utilisationSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clientLabel(c?: ClientOption | null) {
  if (!c) return '—'
  return [c.prenom, c.nom].filter(Boolean).join(' ') || c.email || `#${c.id}`
}

function safeDate(d?: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString()
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function clientInitials(c: ClientOption) {
  const a = (c.prenom ?? '').trim()
  const b = (c.nom ?? '').trim()
  const s = `${a} ${b}`.trim() || 'CL'
  const parts = s.split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase() || 'CL'
}

function ClientSelect({
  value,
  onChange,
  error,
}: {
  value: string | number
  onChange: (v: string) => void
  error?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 300)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const q = useQuery({
    queryKey: ['clients-light', debounced],
    queryFn: async () => {
      const { data } = await api.get('/clients', { params: { search: debounced || undefined, per_page: 25 } })
      return data
    },
    staleTime: 30_000,
  })

  const clients: ClientOption[] = useMemo(() => normalizePaged(q.data).items as ClientOption[], [q.data])
  const selected = clients.find((c) => String(c.id) === String(value)) ?? null

  // Fermer en cliquant dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(true)
    setSearch('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSelect = (c: ClientOption) => {
    onChange(String(c.id))
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className={`input w-full flex items-center gap-2 text-left pr-8 ${error ? 'border-red-400 dark:border-red-500' : ''}`}
      >
        {selected ? (
          <>
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 text-xs font-bold">
              {clientInitials(selected)}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{clientLabel(selected)}</span>
            {selected.email && (
              <span className="hidden sm:block text-xs text-gray-400 truncate max-w-[160px]">{selected.email}</span>
            )}
          </>
        ) : (
          <>
            <User size={15} className="text-gray-400 shrink-0" />
            <span className="text-gray-400 flex-1">Sélectionner un client…</span>
          </>
        )}

        {/* Icônes droite */}
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selected && (
            <span
              role="button"
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              onMouseDown={handleClear}
            >
              <XIcon size={13} />
            </span>
          )}
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c2333] shadow-2xl overflow-hidden">
          {/* Search bar */}
          <div className="p-2 border-b border-black/5 dark:border-white/10">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/5 pl-8 pr-3 py-1.5 text-sm outline-none focus:border-sky-400 dark:focus:border-sky-500"
                placeholder="Rechercher un client…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto">
            {q.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
                <Loader2 size={14} className="animate-spin" /> Chargement…
              </div>
            ) : clients.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">Aucun client trouvé</div>
            ) : (
              clients.map((c) => {
                const isActive = String(c.id) === String(value)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`w-full flex items-center gap-3 px-3 py-1.5 text-left hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors ${
                      isActive ? 'bg-sky-50 dark:bg-sky-500/10' : ''
                    }`}
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 text-xs font-bold">
                      {clientInitials(c)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium truncate ${isActive ? 'text-sky-700 dark:text-sky-300' : ''}`}>
                        {clientLabel(c)}
                      </div>
                      {c.email && <div className="text-xs text-gray-400 truncate">{c.email}</div>}
                    </div>
                    {isActive && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-sky-500" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function SoldeDisplay({ clientId }: { clientId: number }) {
  const q = useQuery({
    queryKey: ['avoir-solde', clientId],
    queryFn: async () => {
      const { data } = await api.get(`/clients/${clientId}/solde-avoir`)
      return data
    },
    enabled: clientId > 0,
  })

  if (!clientId) return null
  if (q.isLoading) return <div className="text-xs text-gray-500">Chargement du solde…</div>

  const solde = Number(q.data?.solde ?? 0)
  return (
    <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${
      solde > 0
        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
        : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
    }`}>
      Solde disponible : {money(solde)}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AvoirsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = String(user?.role ?? '').toLowerCase() === 'admin'

  // ── filters ──
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'' | 'depot' | 'utilisation'>('')
  const debouncedSearch = useDebouncedValue(search, 300)

  // ── modals ──
  const [depotOpen, setDepotOpen] = useState(false)
  const [utilisationOpen, setUtilisationOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id?: number }>({ open: false })

  // ── selected client for solde display ──
  const [depotClientId, setDepotClientId] = useState(0)
  const [utilClientId, setUtilClientId] = useState(0)

  // ─── Query ───────────────────────────────────────────────────────────────

  const q = useQuery({
    queryKey: ['avoirs', { page, search: debouncedSearch, type: filterType }],
    queryFn: async () => {
      const { data } = await api.get('/avoirs', {
        params: {
          page,
          per_page: 10,
          search: debouncedSearch || undefined,
          type: filterType || undefined,
        },
      })
      return data
    },
    placeholderData: keepPreviousData,
  })

  const paged = useMemo(() => normalizePaged(q.data), [q.data])
  const rows = paged.items as Avoir[]

  // Solde global (somme dépôts - utilisations depuis stats)
  const stats = useQuery({
    queryKey: ['avoirs-stats'],
    queryFn: async () => {
      const { data } = await api.get('/avoirs', { params: { per_page: 9999 } })
      const all: Avoir[] = normalizePaged(data).items as Avoir[]
      const totalDepots = all.filter(a => a.type === 'depot').reduce((s, a) => s + Number(a.montant), 0)
      const totalUtil = all.filter(a => a.type === 'utilisation').reduce((s, a) => s + Number(a.montant), 0)
      return { totalDepots, totalUtil, soldeGlobal: totalDepots - totalUtil }
    },
    staleTime: 30_000,
  })

  // ─── Mutations ───────────────────────────────────────────────────────────

  const mDepot = useMutation({
    mutationFn: (vals: DepotInput) =>
      api.post('/avoirs', { ...vals, type: 'depot', facture_id: undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avoirs'] })
      setDepotOpen(false)
      depotForm.reset()
      setDepotClientId(0)
      toast.push({ title: 'Dépôt enregistré', tone: 'success' })
    },
    onError: (e: any) => {
      toast.push({ title: e?.response?.data?.message || 'Erreur lors du dépôt', tone: 'error' })
    },
  })

  const mUtilisation = useMutation({
    mutationFn: (vals: UtilisationInput) =>
      api.post('/avoirs', {
        ...vals,
        type: 'utilisation',
        facture_id: vals.facture_id || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avoirs'] })
      setUtilisationOpen(false)
      utilForm.reset()
      setUtilClientId(0)
      toast.push({ title: 'Utilisation enregistrée', tone: 'success' })
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || "Solde insuffisant ou erreur."
      toast.push({ title: msg, tone: 'error' })
    },
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/avoirs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avoirs'] })
      toast.push({ title: 'Avoir supprimé', tone: 'success' })
    },
    onError: (e: any) => {
      toast.push({ title: e?.response?.data?.message || 'Erreur suppression', tone: 'error' })
    },
  })

  // ─── Forms ───────────────────────────────────────────────────────────────

  const depotForm = useForm<DepotInput>({ resolver: zodResolver(depotSchema) })
  const utilForm  = useForm<UtilisationInput>({ resolver: zodResolver(utilisationSchema) })

  const onDepotSubmit = (vals: DepotInput) => mDepot.mutate(vals)
  const onUtilSubmit  = (vals: UtilisationInput) => mUtilisation.mutate(vals)

  // ─── UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
            <Wallet size={16} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">Avoirs clients</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
              Crédit prépayé — dépôts et utilisations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-sm font-semibold shadow-sm transition"
            onClick={() => { setDepotOpen(true); depotForm.reset(); setDepotClientId(0) }}
          >
            <ArrowDownToLine size={15} /> Nouveau dépôt
          </button>
          <button
            className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-sm font-semibold shadow-sm transition"
            onClick={() => { setUtilisationOpen(true); utilForm.reset(); setUtilClientId(0) }}
          >
            <ArrowUpFromLine size={15} /> Utiliser avoir
          </button>
        </div>
      </div>

      {/* KPI cards inline */}
      {stats.data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/15">
                <ArrowDownToLine size={14} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate">Total dépôts</div>
            </div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums truncate">{money(stats.data.totalDepots)}</div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/15">
                <ArrowUpFromLine size={14} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate">Utilisations</div>
            </div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums truncate">{money(stats.data.totalUtil)}</div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/15">
                <TrendingUp size={14} className="text-sky-600 dark:text-sky-400" />
              </div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate">Solde global</div>
            </div>
            <div className={`text-sm font-bold tabular-nums truncate ${stats.data.soldeGlobal >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-red-600 dark:text-red-400'}`}>{money(stats.data.soldeGlobal)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <FiltersBar>
        <div>
          <label className="label flex items-center gap-1.5">
            Recherche client
            {q.isFetching && !q.isLoading && <Loader2 size={12} className="animate-spin text-gray-400" />}
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              className="input !pl-9"
              placeholder="Nom, email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>
        <div>
          <label className="label">Type</label>
          <select
            className="input"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value as any); setPage(1) }}
          >
            <option value="">Tous</option>
            <option value="depot">Dépôts</option>
            <option value="utilisation">Utilisations</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            className="btn bg-gray-200 dark:bg-white/10 w-full"
            onClick={() => { setSearch(''); setFilterType(''); setPage(1) }}
          >
            Réinitialiser
          </button>
        </div>
      </FiltersBar>

      {/* Liste */}
      <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
        {/* List header */}
        <div className="hidden sm:grid sm:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_72px] md:grid-cols-[minmax(0,1.8fr)_100px_minmax(0,1fr)_minmax(0,1fr)_100px_72px] items-center gap-3 px-4 py-2 border-b border-black/[0.04] dark:border-white/[0.05] bg-gray-50/80 dark:bg-white/[0.02]">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">Client</span>
          <span className="hidden md:inline text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Type</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Montant</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Solde</span>
          <span className="hidden md:inline text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Date</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Actions</span>
        </div>

        {q.isLoading ? (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="h-7 w-7 rounded-full bg-black/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 h-3 rounded bg-black/[0.06] animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-black/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
              <Wallet size={22} className="text-gray-300 dark:text-gray-600" />
            </div>
            <div className="text-base font-semibold text-gray-500 dark:text-gray-400">Aucun avoir trouvé</div>
            <div className="text-sm text-gray-400 dark:text-gray-600 mt-1 mb-4">
              Commencez par enregistrer un dépôt pour un client
            </div>
            <button
              onClick={() => { setDepotOpen(true); depotForm.reset(); setDepotClientId(0) }}
              className="inline-flex whitespace-nowrap items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-sm font-semibold transition"
            >
              <ArrowDownToLine size={15} /> Nouveau dépôt
            </button>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {rows.map((a) => {
              const ini = clientInitials({
                id: a.client?.id ?? 0,
                nom: a.client?.nom ?? '',
                prenom: (a.client as any)?.prenom ?? '',
                email: a.client?.email ?? '',
              } as ClientOption)
              const isDepot = a.type === 'depot'

              return (
                <div
                  key={a.id}
                  className="group flex flex-col sm:grid sm:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_72px] md:grid-cols-[minmax(0,1.8fr)_100px_minmax(0,1fr)_minmax(0,1fr)_100px_72px] sm:items-center gap-1 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-2 hover:bg-gray-50/80 dark:hover:bg-white/[0.025] transition-colors"
                >
                  {/* Cell 1 : Client */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      isDepot ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                    }`}>
                      {ini}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={clientLabel(a.client)}>{clientLabel(a.client)}</div>
                      {a.client?.email && (
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate hidden lg:block">{a.client.email}</div>
                      )}
                    </div>
                    {/* Actions mobile */}
                    {isAdmin && (
                      <button
                        type="button"
                        className="flex sm:hidden shrink-0 h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 -mr-1"
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: a.id }) }}
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Cell 2 : Type (md+) */}
                  <div className="hidden md:flex items-center justify-center">
                    {isDepot ? (
                      <Badge tone="green"><ArrowDownToLine size={11} className="mr-1" /> Dépôt</Badge>
                    ) : (
                      <Badge tone="amber"><ArrowUpFromLine size={11} className="mr-1" /> Utilisation</Badge>
                    )}
                  </div>

                  {/* Cell 3 : Montant (sm+) */}
                  <div className="hidden sm:flex items-center justify-center">
                    <span className={`text-sm font-bold tabular-nums ${isDepot ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {isDepot ? '+' : '−'}{money(a.montant)}
                    </span>
                  </div>

                  {/* Cell 4 : Solde après (sm+) */}
                  <div className="hidden sm:flex items-center justify-center text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                    {money(a.solde_apres)}
                  </div>

                  {/* Cell 5 : Date (md+) */}
                  <div className="hidden md:flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                    {safeDate(a.date_avoir || a.created_at)}
                  </div>

                  {/* Mobile summary */}
                  <div className="flex sm:hidden flex-wrap items-center justify-between gap-2 pl-9">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isDepot ? (
                        <Badge tone="green"><ArrowDownToLine size={11} className="mr-1" /> Dépôt</Badge>
                      ) : (
                        <Badge tone="amber"><ArrowUpFromLine size={11} className="mr-1" /> Utilisation</Badge>
                      )}
                      <span className="text-[10px] text-gray-400 tabular-nums">{safeDate(a.date_avoir || a.created_at)}</span>
                    </div>
                    <span className={`text-sm font-bold tabular-nums shrink-0 ${isDepot ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {isDepot ? '+' : '−'}{money(a.montant)}
                    </span>
                  </div>

                  {/* Cell 6 : Actions (sm+) */}
                  <div className="hidden sm:flex justify-center">
                    {isAdmin && (
                      <button
                        type="button"
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: a.id }) }}
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Pagination page={page} lastPage={paged.lastPage} total={paged.total} perPage={10} onPage={setPage} />

      {/* ── Modal Dépôt ─────────────────────────────────────────────────────── */}
      <Modal
        open={depotOpen}
        onClose={() => { setDepotOpen(false); depotForm.reset(); setDepotClientId(0) }}
        title="Nouveau dépôt d'avoir"
        widthClass="max-w-lg"
      >
        <form onSubmit={depotForm.handleSubmit(onDepotSubmit)} className="space-y-3">
          <div>
            <label className="label">Client</label>
            <Controller
              name="client_id"
              control={depotForm.control}
              render={({ field }) => (
                <ClientSelect
                  value={field.value ?? ''}
                  onChange={(v) => { field.onChange(v); setDepotClientId(Number(v)) }}
                  error={depotForm.formState.errors.client_id?.message}
                />
              )}
            />
          </div>

          {depotClientId > 0 && <SoldeDisplay clientId={depotClientId} />}

          <div>
            <label className="label">Montant (XOF)</label>
            <input
              type="number"
              className="input"
              placeholder="ex: 500000"
              min={1}
              {...depotForm.register('montant')}
            />
            {depotForm.formState.errors.montant && (
              <p className="text-xs text-red-500 mt-1">{depotForm.formState.errors.montant.message}</p>
            )}
          </div>

          <div>
            <label className="label">Référence (optionnel)</label>
            <input type="text" className="input" placeholder="ex: RECU-001" {...depotForm.register('reference')} />
          </div>

          <div>
            <label className="label">Date</label>
            <input type="date" className="input" {...depotForm.register('date_avoir')} />
          </div>

          <div>
            <label className="label">Notes (optionnel)</label>
            <textarea className="input min-h-[72px] resize-y" placeholder="Remarques…" {...depotForm.register('notes')} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/10">
            <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={() => { setDepotOpen(false); depotForm.reset(); setDepotClientId(0) }}>
              Annuler
            </button>
            <button
              type="submit"
              disabled={mDepot.isPending}
              className="btn bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-2"
            >
              {mDepot.isPending && <Loader2 size={14} className="animate-spin" />}
              Enregistrer le dépôt
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Utilisation ────────────────────────────────────────────────── */}
      <Modal
        open={utilisationOpen}
        onClose={() => { setUtilisationOpen(false); utilForm.reset(); setUtilClientId(0) }}
        title="Utiliser un avoir"
        widthClass="max-w-lg"
      >
        <form onSubmit={utilForm.handleSubmit(onUtilSubmit)} className="space-y-3">
          <div>
            <label className="label">Client</label>
            <Controller
              name="client_id"
              control={utilForm.control}
              render={({ field }) => (
                <ClientSelect
                  value={field.value ?? ''}
                  onChange={(v) => { field.onChange(v); setUtilClientId(Number(v)) }}
                  error={utilForm.formState.errors.client_id?.message}
                />
              )}
            />
          </div>

          {utilClientId > 0 && <SoldeDisplay clientId={utilClientId} />}

          <div>
            <label className="label">Montant à utiliser (XOF)</label>
            <input
              type="number"
              className="input"
              placeholder="ex: 150000"
              min={1}
              {...utilForm.register('montant')}
            />
            {utilForm.formState.errors.montant && (
              <p className="text-xs text-red-500 mt-1">{utilForm.formState.errors.montant.message}</p>
            )}
          </div>

          <div>
            <label className="label">N° Facture liée (optionnel)</label>
            <input
              type="number"
              className="input"
              placeholder="ID de la facture"
              {...utilForm.register('facture_id')}
            />
          </div>

          <div>
            <label className="label">Référence (optionnel)</label>
            <input type="text" className="input" placeholder="ex: FAC-20260503-ABCDEF" {...utilForm.register('reference')} />
          </div>

          <div>
            <label className="label">Date</label>
            <input type="date" className="input" {...utilForm.register('date_avoir')} />
          </div>

          <div>
            <label className="label">Notes (optionnel)</label>
            <textarea className="input min-h-[72px] resize-y" placeholder="Achat billet Paris-Dakar, pax: Dupont…" {...utilForm.register('notes')} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/10">
            <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={() => { setUtilisationOpen(false); utilForm.reset(); setUtilClientId(0) }}>
              Annuler
            </button>
            <button
              type="submit"
              disabled={mUtilisation.isPending}
              className="btn bg-amber-500 hover:bg-amber-600 text-white inline-flex items-center gap-2"
            >
              {mUtilisation.isPending && <Loader2 size={14} className="animate-spin" />}
              Confirmer l'utilisation
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Delete ───────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDelete.open}
        title="Supprimer cet avoir ?"
        message="Cette suppression modifie l'historique du solde client. Action irréversible."
        onCancel={() => setConfirmDelete({ open: false })}
        onConfirm={() => {
          if (confirmDelete.id) mDelete.mutate(confirmDelete.id)
          setConfirmDelete({ open: false })
        }}
      />
    </div>
  )
}
