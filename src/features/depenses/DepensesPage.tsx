import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Receipt, Search, Plus, Eye, Pencil, Trash2, X,
  TrendingDown, CheckCircle2, Clock, Loader2,
} from 'lucide-react'
import { DatePickerInput } from '../../ui/DatePickerInput'
import { api } from '../../lib/axios'
import { cx, useDebouncedValue } from '../../lib/helpers'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { Pagination } from '../../ui/Pagination'
import { useToast } from '../../ui/Toasts'
import { ActionsMenu } from '../../ui/ActionsMenu'
import DepenseDetails, { CAT_CONFIG, type DepenseModel, type DepenseCategorie } from './DepenseDetails'
import DepensesForm, { type DepenseInput } from './DepensesForm'
import type { LaravelPage } from '../../types/models'

function safeDate(d?: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_36px] items-center gap-4 px-5 py-4 border-b border-black/[0.04] dark:border-white/[0.05] border-l-[3px] border-l-transparent">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-black/[0.06] dark:bg-white/[0.06] animate-pulse shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-32 rounded-lg bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
          <div className="h-2.5 w-20 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
        </div>
      </div>
      <div className="hidden sm:grid place-items-center">
        <div className="h-3.5 w-20 rounded-lg bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
      </div>
      <div className="hidden sm:grid place-items-center">
        <div className="h-3.5 w-24 rounded-lg bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
      </div>
      <div className="hidden sm:grid place-items-center">
        <div className="h-5 w-16 rounded-full bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
      </div>
      <div className="h-7 w-7 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
    </div>
  )
}

function KpiMini({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] px-4 py-3 shadow-sm">
      <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{value}</div>
      </div>
    </div>
  )
}

const CAT_KEYS = Object.keys(CAT_CONFIG) as DepenseCategorie[]

export default function DepensesPage() {
  const qc = useQueryClient()
  const toast = useToast()

  const [page, setPage] = useState(1)
  const perPage = 10

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [fCat, setFCat] = useState<DepenseCategorie | ''>('')
  const [fStatut, setFStatut] = useState<'paye' | 'en_attente' | ''>('')
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editing, setEditing] = useState<DepenseModel | null>(null)
  const [viewing, setViewing] = useState<DepenseModel | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [confirmName, setConfirmName] = useState<string | undefined>(undefined)

  const qDepenses = useQuery({
    queryKey: ['depenses-all'],
    queryFn: async () => {
      const { data } = await api.get('/depenses', { params: { page: 1, per_page: 200 } })
      if (Array.isArray(data)) return data as DepenseModel[]
      return (data as LaravelPage<DepenseModel>)?.data ?? []
    },
    staleTime: 20_000,
  })

  const depenses = useMemo(() => qDepenses.data ?? [], [qDepenses.data])

  const filtered = useMemo(() => {
    let list = [...depenses]
    const s = debouncedSearch.trim().toLowerCase()
    if (s) {
      list = list.filter((d) => {
        return (
          (d.libelle ?? '').toLowerCase().includes(s) ||
          (d.fournisseur_nom ?? '').toLowerCase().includes(s) ||
          (d.reference ?? '').toLowerCase().includes(s) ||
          String(d.id).includes(s)
        )
      })
    }
    if (fCat) list = list.filter((d) => d.categorie === fCat)
    if (fStatut) list = list.filter((d) => d.statut === fStatut)
    if (fFrom) list = list.filter((d) => (d.date_depense || '') >= fFrom)
    if (fTo) list = list.filter((d) => (d.date_depense || '') <= fTo)
    list.sort((a, b) => +new Date(b.date_depense) - +new Date(a.date_depense))
    return list
  }, [depenses, debouncedSearch, fCat, fStatut, fFrom, fTo])

  const total = filtered.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))

  useEffect(() => {
    setPage((p) => Math.min(p, lastPage))
  }, [lastPage])

  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page, perPage])

  const kpis = useMemo(() => ({
    total: filtered.reduce((s, d) => s + Number(d.montant || 0), 0),
    payees: filtered.filter((d) => d.statut === 'paye').length,
    enAttente: filtered.filter((d) => d.statut === 'en_attente').length,
  }), [filtered])

  const hasFilters = !!(search || fCat || fStatut || fFrom || fTo)

  const clearFilters = () => {
    setSearch('')
    setFCat('')
    setFStatut('')
    setFFrom('')
    setFTo('')
    setPage(1)
  }

  const mCreate = useMutation({
    mutationFn: (vals: DepenseInput) => api.post('/depenses', vals),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['depenses-all'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Dépense enregistrée', tone: 'success' })
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.push({
        title: `Erreur: ${e?.response?.data?.message ?? 'Impossible de créer la dépense'}`,
        tone: 'error',
      })
    },
  })

  const mUpdate = useMutation({
    mutationFn: ({ id, vals }: { id: number; vals: DepenseInput }) => api.put(`/depenses/${id}`, vals),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['depenses-all'] })
      setFormOpen(false)
      setEditing(null)
      toast.push({ title: 'Dépense mise à jour', tone: 'success' })
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.push({
        title: `Erreur: ${e?.response?.data?.message ?? 'Impossible de modifier la dépense'}`,
        tone: 'error',
      })
    },
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/depenses/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['depenses-all'] })
      setConfirmId(null)
      toast.push({ title: 'Dépense supprimée', tone: 'success' })
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.push({
        title: `Erreur: ${e?.response?.data?.message ?? 'Suppression impossible'}`,
        tone: 'error',
      })
    },
  })

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (d: DepenseModel) => {
    setEditing(d)
    setDetailsOpen(false)
    setViewing(null)
    setFormOpen(true)
  }

  const openDetails = (d: DepenseModel) => {
    setViewing(d)
    setDetailsOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 dark:bg-[var(--ut-orange)]/15 text-[var(--ut-orange)]">
            <Receipt size={16} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">Dépenses</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
              {total} dépense{total > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition shadow-sm shrink-0"
        >
          <Plus size={15} /> Nouvelle dépense
        </button>
      </div>

      {!qDepenses.isLoading && depenses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiMini
            label="Total dépenses"
            value={`${kpis.total.toLocaleString('fr-FR')} XOF`}
            icon={<TrendingDown size={16} className="text-[var(--ut-orange)]" />}
            color="bg-orange-100 dark:bg-[var(--ut-orange)]/15"
          />
          <KpiMini
            label="Payées"
            value={`${kpis.payees} dépense${kpis.payees > 1 ? 's' : ''}`}
            icon={<CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />}
            color="bg-emerald-100 dark:bg-emerald-500/15"
          />
          <KpiMini
            label="En attente"
            value={`${kpis.enAttente} dépense${kpis.enAttente > 1 ? 's' : ''}`}
            icon={<Clock size={16} className="text-amber-600 dark:text-amber-400" />}
            color="bg-amber-100 dark:bg-amber-500/15"
          />
        </div>
      )}

      <div className="rounded-2xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] p-4 space-y-3 shadow-sm">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] pl-9 pr-9 py-1.5 text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-[var(--ut-orange)] focus:ring-2 focus:ring-[var(--ut-orange)]/20 transition-all"
            placeholder="Rechercher (libellé, fournisseur, référence)"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          {search ? (
            <button
              onClick={() => { setSearch(''); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={14} />
            </button>
          ) : qDepenses.isFetching && !qDepenses.isLoading ? (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400 pointer-events-none" />
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setFCat(''); setPage(1) }}
            className={cx(
              'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
              fCat === ''
                ? '!bg-gray-900 !border-gray-900 !text-white dark:!bg-white dark:!border-white dark:!text-gray-900'
                : 'border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20',
            )}
          >
            Toutes
          </button>
          {CAT_KEYS.map((key) => {
            const conf = CAT_CONFIG[key]
            const CatIcon = conf.icon
            const isActive = fCat === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setFCat(isActive ? '' : key); setPage(1) }}
                className={cx(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                  isActive
                    ? cx(conf.badge, 'border-transparent')
                    : 'border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20',
                )}
              >
                <CatIcon size={12} />
                {conf.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { value: '' as const, label: 'Tous statuts' },
            { value: 'paye' as const, label: 'Payées', cls: 'data-[active=true]:bg-emerald-500 data-[active=true]:border-emerald-500 data-[active=true]:text-white' },
            { value: 'en_attente' as const, label: 'En attente', cls: 'data-[active=true]:bg-amber-500 data-[active=true]:border-amber-500 data-[active=true]:text-white' },
          ].map((pill) => (
            <button
              key={pill.value}
              type="button"
              data-active={fStatut === pill.value ? 'true' : 'false'}
              onClick={() => { setFStatut(pill.value); setPage(1) }}
              className={cx(
                'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                'border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20',
                fStatut === pill.value && pill.value === ''
                  ? '!bg-gray-900 !border-gray-900 !text-white dark:!bg-white dark:!border-white dark:!text-gray-900'
                  : '',
                pill.value === 'paye' && fStatut === 'paye'
                  ? '!bg-emerald-500 !border-emerald-500 !text-white'
                  : '',
                pill.value === 'en_attente' && fStatut === 'en_attente'
                  ? '!bg-amber-500 !border-amber-500 !text-white'
                  : '',
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DatePickerInput
            label="Date de début"
            value={fFrom}
            onChange={(v) => { setFFrom(v); setPage(1) }}
            placeholder="Toutes les dates"
          />
          <DatePickerInput
            label="Date de fin"
            value={fTo}
            onChange={(v) => { setFTo(v); setPage(1) }}
            placeholder="Toutes les dates"
          />
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <X size={13} /> Effacer filtres
          </button>
        )}
      </div>

      <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
        <div className="hidden sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_72px] md:grid-cols-[minmax(0,2fr)_100px_minmax(0,1fr)_minmax(0,1fr)_72px] items-center gap-3 px-4 py-2 border-b border-black/[0.04] dark:border-white/[0.05] bg-gray-50/80 dark:bg-white/[0.02] border-l-[3px] border-l-transparent">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">Dépense</span>
          <span className="hidden md:inline text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Date</span>
          <span className="hidden md:inline text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Montant</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Statut</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Actions</span>
        </div>

        {qDepenses.isLoading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
              <Receipt size={22} className="text-gray-300 dark:text-gray-600" />
            </div>
            <div className="text-base font-semibold text-gray-500 dark:text-gray-400">Aucune dépense trouvée</div>
            <div className="text-sm text-gray-400 dark:text-gray-600 mt-1 mb-4">
              {hasFilters ? 'Essayez de modifier vos filtres' : 'Commencez par enregistrer une dépense'}
            </div>
            {hasFilters ? (
              <button
                onClick={clearFilters}
                className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <X size={14} /> Effacer les filtres
              </button>
            ) : (
              <button
                onClick={openCreate}
                className="inline-flex whitespace-nowrap items-center gap-2 rounded-xl bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition"
              >
                <Plus size={15} /> Nouvelle dépense
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {pageItems.map((d) => {
              const cat = CAT_CONFIG[d.categorie] ?? CAT_CONFIG.autre
              const CatIcon = cat.icon
              const statutBadge = d.statut === 'paye'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
              const statutDot = d.statut === 'paye' ? 'bg-emerald-400' : 'bg-amber-400'
              const statutLabel = d.statut === 'paye' ? 'Payé' : 'En attente'

              const actions = [
                { label: 'Voir', icon: <Eye size={15} />, onClick: () => openDetails(d) },
                { label: 'Modifier', icon: <Pencil size={15} />, onClick: () => openEdit(d) },
                { label: 'Supprimer', icon: <Trash2 size={15} />, tone: 'danger' as const, onClick: () => { setConfirmId(d.id); setConfirmName(d.libelle) } },
              ]

              return (
                <div
                  key={d.id}
                  className={cx(
                    'group flex flex-col sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_72px] md:grid-cols-[minmax(0,2fr)_100px_minmax(0,1fr)_minmax(0,1fr)_72px] sm:items-center gap-1 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-2',
                    'hover:bg-gray-50/80 dark:hover:bg-white/[0.025] transition-colors cursor-pointer',
                    'border-l-[3px]', cat.accent,
                  )}
                  onClick={() => openDetails(d)}
                >
                  {/* Cell 1 : Avatar + libellé (+ actions inline mobile) */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cx('h-7 w-7 shrink-0 rounded-full flex items-center justify-center', cat.iconBg)}>
                      <CatIcon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={d.libelle}>
                        {d.libelle}
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        {d.fournisseur_nom ? d.fournisseur_nom : d.reference ? `Réf: ${d.reference}` : cat.label}
                      </div>
                    </div>
                    {/* Actions sur mobile */}
                    <div onClick={(e) => e.stopPropagation()} className="flex sm:hidden shrink-0 -mr-1">
                      <ActionsMenu items={actions} />
                    </div>
                  </div>

                  {/* Cell 2 : Date (md+) */}
                  <div className="hidden md:flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 tabular-nums">
                    {safeDate(d.date_depense)}
                  </div>

                  {/* Cell 3 : Montant (md+) */}
                  <div className="hidden md:flex items-center justify-center gap-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                      {Number(d.montant || 0).toLocaleString('fr-FR')}
                    </span>
                    <span className="text-[10px] font-normal text-gray-400">XOF</span>
                  </div>

                  {/* Cell 4 : Statut (sm+) */}
                  <div className="hidden sm:flex items-center justify-center">
                    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap', statutBadge)}>
                      <span className={cx('h-1 w-1 rounded-full shrink-0', statutDot)} />
                      {statutLabel}
                    </span>
                  </div>

                  {/* Mobile summary (xs only) */}
                  <div className="flex sm:hidden flex-wrap items-center justify-between gap-2 pl-9">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', statutBadge)}>
                        <span className={cx('h-1 w-1 rounded-full', statutDot)} />
                        {statutLabel}
                      </span>
                      <span className="text-[10px] text-gray-400 tabular-nums">{safeDate(d.date_depense)}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
                      {Number(d.montant || 0).toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-gray-400">XOF</span>
                    </span>
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

      <Pagination page={page} lastPage={lastPage} total={total} perPage={perPage} onPage={setPage} />

      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        title={editing ? 'Modifier la dépense' : 'Nouvelle dépense'}
        widthClass="max-w-2xl"
      >
        <DepensesForm
          defaultValues={
            editing
              ? {
                  date_depense: editing.date_depense,
                  categorie: editing.categorie,
                  libelle: editing.libelle,
                  fournisseur_nom: editing.fournisseur_nom ?? undefined,
                  reference: editing.reference ?? undefined,
                  montant: Number(editing.montant || 0),
                  mode_paiement: editing.mode_paiement ?? undefined,
                  statut: editing.statut,
                  reservation_id: editing.reservation_id ?? undefined,
                  notes: editing.notes ?? undefined,
                }
              : undefined
          }
          submitting={mCreate.isPending || mUpdate.isPending}
          onCancel={() => { setFormOpen(false); setEditing(null) }}
          onSubmit={(vals) => {
            if (editing) mUpdate.mutate({ id: editing.id, vals })
            else mCreate.mutate(vals)
          }}
        />
      </Modal>

      <Modal
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setViewing(null) }}
        title="Détails de la dépense"
        widthClass="max-w-2xl"
      >
        {viewing && (
          <DepenseDetails
            depense={viewing}
            onEdit={() => openEdit(viewing)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={confirmId !== null}
        title="Supprimer la dépense ?"
        message="Cette action est définitive et irréversible."
        itemName={confirmName}
        onCancel={() => { setConfirmId(null); setConfirmName(undefined) }}
        onConfirm={() => { if (confirmId != null) mDelete.mutate(confirmId); setConfirmName(undefined) }}
      />
    </div>
  )
}
