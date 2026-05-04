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
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                <Loader2 size={14} className="animate-spin" /> Chargement…
              </div>
            ) : clients.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">Aucun client trouvé</div>
            ) : (
              clients.map((c) => {
                const isActive = String(c.id) === String(value)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors ${
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wallet size={18} /> Avoirs clients
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Crédit prépayé — dépôts et utilisations par client
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-2"
            onClick={() => { setDepotOpen(true); depotForm.reset(); setDepotClientId(0) }}
          >
            <ArrowDownToLine size={16} /> Nouveau dépôt
          </button>
          <button
            className="btn bg-amber-500 hover:bg-amber-600 text-white inline-flex items-center gap-2"
            onClick={() => { setUtilisationOpen(true); utilForm.reset(); setUtilClientId(0) }}
          >
            <ArrowUpFromLine size={16} /> Utiliser avoir
          </button>
        </div>
      </div>

      {/* KPI cards */}
      {stats.data && (
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="card">
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <ArrowDownToLine size={15} className="text-emerald-500" /> Total dépôts
            </div>
            <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {money(stats.data.totalDepots)}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <ArrowUpFromLine size={15} className="text-amber-500" /> Total utilisations
            </div>
            <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
              {money(stats.data.totalUtil)}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <TrendingUp size={15} className="text-sky-500" /> Solde global
            </div>
            <div className={`text-2xl font-bold mt-1 ${stats.data.soldeGlobal >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-red-600 dark:text-red-400'}`}>
              {money(stats.data.soldeGlobal)}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <FiltersBar>
        <div>
          <label className="label">Recherche client</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              className="input pl-9"
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

      {/* Table */}
      {q.isLoading ? (
        <div className="card flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Chargement…
        </div>
      ) : rows.length === 0 ? (
        <div className="card">
          <div className="font-semibold">Aucun avoir trouvé</div>
          <div className="text-sm text-gray-500 mt-1">
            Commencez par enregistrer un dépôt pour un client.
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden overflow-x-auto">
          <T>
            <thead className="bg-gray-100/70 dark:bg-white/5">
              <tr>
                <Th>Client</Th>
                <Th>Type</Th>
                <Th>Montant</Th>
                <Th className="hidden md:table-cell">Solde après</Th>
                <Th className="hidden lg:table-cell">Référence</Th>
                <Th className="hidden lg:table-cell">Facture</Th>
                <Th className="hidden md:table-cell">Date</Th>
                <Th className="w-12"></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-black/5 dark:border-white/10">
                  <Td>
                    <div className="font-medium">{clientLabel(a.client)}</div>
                    {a.client?.email && (
                      <div className="text-xs text-gray-500 truncate">{a.client.email}</div>
                    )}
                  </Td>
                  <Td>
                    {a.type === 'depot' ? (
                      <Badge tone="green">
                        <ArrowDownToLine size={12} className="mr-1" /> Dépôt
                      </Badge>
                    ) : (
                      <Badge tone="amber">
                        <ArrowUpFromLine size={12} className="mr-1" /> Utilisation
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <span className={`font-semibold ${a.type === 'depot' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {a.type === 'utilisation' ? '−' : '+'}{money(a.montant)}
                    </span>
                  </Td>
                  <Td className="hidden md:table-cell text-sm">{money(a.solde_apres)}</Td>
                  <Td className="hidden lg:table-cell text-sm">{a.reference || '—'}</Td>
                  <Td className="hidden lg:table-cell text-sm">
                    {a.facture ? (
                      <span className="text-sky-600 dark:text-sky-400">{a.facture.numero || `#${a.facture.id}`}</span>
                    ) : '—'}
                  </Td>
                  <Td className="hidden md:table-cell text-sm">{safeDate(a.date_avoir || a.created_at)}</Td>
                  <Td>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn px-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                        onClick={() => setConfirmDelete({ open: true, id: a.id })}
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </T>
        </div>
      )}

      <Pagination page={page} lastPage={paged.lastPage} total={paged.total} onPage={setPage} />

      {/* ── Modal Dépôt ─────────────────────────────────────────────────────── */}
      <Modal
        open={depotOpen}
        onClose={() => { setDepotOpen(false); depotForm.reset(); setDepotClientId(0) }}
        title="Nouveau dépôt d'avoir"
        widthClass="max-w-lg"
      >
        <form onSubmit={depotForm.handleSubmit(onDepotSubmit)} className="space-y-4">
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
        <form onSubmit={utilForm.handleSubmit(onUtilSubmit)} className="space-y-4">
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
