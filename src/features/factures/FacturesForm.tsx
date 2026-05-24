import React, { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Hash, Calendar, AlertCircle, FileText, Search, X, Check, User, Loader2 } from 'lucide-react'
import { api } from '../../lib/axios'
import { useDebouncedValue } from '../../lib/helpers'

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')

// ─── Types ───────────────────────────────────────────────────────────────────

type ReservationOption = {
  id: number
  reference?: string | null
  type_label?: string | null
  type?: string | null
  statut?: string | null
  client?: { prenom?: string | null; nom?: string | null; email?: string | null } | null
}

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUTS = [
  { value: 'impayee',   label: 'Impayee',   active: 'bg-red-500 border-red-500 text-white' },
  { value: 'emis',      label: 'Emise',     active: 'bg-sky-500 border-sky-500 text-white' },
  { value: 'partielle', label: 'Partielle', active: 'bg-amber-500 border-amber-500 text-white' },
  { value: 'payee',     label: 'Payee',     active: 'bg-emerald-500 border-emerald-500 text-white' },
]

const schema = z.object({
  numero:         z.string().min(1, 'Le numero est requis'),
  statut:         z.enum(['payee', 'impayee', 'partielle', 'emis']).default('impayee'),
  total:          z.number({ invalid_type_error: 'Montant requis' }).nonnegative('Montant invalide'),
  due_date:       z.string().optional(),
  reservation_id: z.number().int().optional(),
})

export type FactureInput = z.infer<typeof schema>

// ─── UI helpers ──────────────────────────────────────────────────────────────

const inputBase = (hasError?: boolean) => cx(
  'w-full rounded-xl border py-1.5 text-sm transition-all',
  'bg-white dark:bg-[#1c2535]',
  'text-gray-900 dark:text-gray-100',
  'placeholder-gray-400 dark:placeholder-gray-600',
  'focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400 dark:focus:border-sky-500',
  hasError
    ? 'border-red-400 dark:border-red-500'
    : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20',
)

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-black/[0.05] dark:border-white/[0.07]">
      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {children}
      </span>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 mt-1.5 text-xs text-red-500">
      <AlertCircle size={11} className="shrink-0" /> {message}
    </p>
  )
}

function reservationLabel(r: ReservationOption) {
  const client = [r.client?.prenom, r.client?.nom].filter(Boolean).join(' ') || r.client?.email || null
  const ref = r.reference || `#${r.id}`
  return client ? `${ref} — ${client}` : ref
}

// ─── ReservationSearch combobox ───────────────────────────────────────────────

function ReservationSearch({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (id: number | undefined, label: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')
  const debouncedQuery = useDebouncedValue(query, 280)
  const containerRef = useRef<HTMLDivElement>(null)

  // close on click-outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const { data, isFetching } = useQuery({
    queryKey: ['reservations-search', debouncedQuery],
    queryFn: async () => {
      const { data } = await api.get('/reservations', {
        params: { search: debouncedQuery || undefined, per_page: 8 },
      })
      const items: ReservationOption[] = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : []
      return items
    },
    enabled: open,
    staleTime: 15_000,
  })

  const results = data ?? []

  const select = (r: ReservationOption) => {
    const label = reservationLabel(r)
    setSelectedLabel(label)
    setQuery('')
    setOpen(false)
    onChange(r.id, label)
  }

  const clear = () => {
    setSelectedLabel('')
    setQuery('')
    onChange(undefined, '')
  }

  return (
    <div ref={containerRef} className="relative">

      {/* Selected chip */}
      {value && selectedLabel ? (
        <div className="flex items-center gap-2 rounded-xl border border-sky-400 dark:border-sky-500 bg-sky-50 dark:bg-sky-500/10 px-3 py-1.5">
          <Check size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="flex-1 text-sm text-sky-800 dark:text-sky-200 truncate font-medium">
            {selectedLabel}
          </span>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        /* Search input */
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Rechercher une reservation..."
            className={cx(inputBase(), 'pl-9 pr-3')}
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && !value && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c2535] shadow-xl overflow-hidden">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-sm text-gray-400">
              {isFetching ? 'Recherche...' : query ? 'Aucune reservation trouvee' : 'Tapez pour rechercher'}
            </div>
          ) : (
            <ul className="divide-y divide-black/[0.04] dark:divide-white/[0.04] max-h-56 overflow-y-auto">
              {results.map((r) => {
                const clientName = [r.client?.prenom, r.client?.nom].filter(Boolean).join(' ') || r.client?.email || null
                const ref = r.reference || `#${r.id}`
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => select(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors group"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 group-hover:bg-sky-100 dark:group-hover:bg-sky-500/20 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        <User size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {ref}
                          {r.type_label || r.type ? (
                            <span className="ml-2 text-xs font-normal text-gray-400">
                              {r.type_label || r.type}
                            </span>
                          ) : null}
                        </div>
                        {clientName && (
                          <div className="text-xs text-gray-400 truncate mt-0.5">{clientName}</div>
                        )}
                      </div>
                      {r.statut && (
                        <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.07] text-gray-500 dark:text-gray-400">
                          {r.statut}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Form ────────────────────────────────────────────────────────────────────

export const FacturesForm: React.FC<{
  defaultValues?: Partial<FactureInput>
  onSubmit: (vals: FactureInput) => void
  onCancel: () => void
  submitting?: boolean
}> = ({ defaultValues, onSubmit, onCancel, submitting }) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FactureInput>({
    resolver: zodResolver(schema),
    defaultValues: { statut: 'impayee', ...defaultValues },
  })

  const statut = watch('statut')
  const reservationId = watch('reservation_id')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* ── Informations ── */}
      <div className="space-y-3">
        <SectionTitle>
          <FileText size={12} className="inline mr-1" />
          Informations
        </SectionTitle>

        {/* Numero */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Numero <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              {...register('numero')}
              placeholder="FACT-2025-001"
              className={cx(inputBase(!!errors.numero), 'pl-9 pr-3')}
            />
          </div>
          <FieldError message={errors.numero?.message} />
        </div>

        {/* Reservation search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Reservation liee <span className="text-xs font-normal text-gray-400">(optionnel)</span>
          </label>
          <ReservationSearch
            value={reservationId}
            onChange={(id) => setValue('reservation_id', id)}
          />
        </div>
      </div>

      {/* ── Statut ── */}
      <div className="space-y-3">
        <SectionTitle>Statut</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {STATUTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setValue('statut', s.value as FactureInput['statut'])}
              className={cx(
                'px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all',
                statut === s.value
                  ? s.active
                  : 'border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20 bg-transparent',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Montant & Echeance ── */}
      <div className="space-y-3">
        <SectionTitle>Montant & Echeance</SectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Montant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Montant total <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                {...register('total', { valueAsNumber: true })}
                placeholder="0"
                className={cx(inputBase(!!errors.total), 'pl-3 pr-14 font-mono')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 dark:text-gray-500 pointer-events-none">
                XOF
              </span>
            </div>
            <FieldError message={errors.total?.message as string} />
          </div>

          {/* Echeance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Date d'echeance <span className="text-xs font-normal text-gray-400">(optionnel)</span>
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                {...register('due_date')}
                className={cx(inputBase(), 'pl-9 pr-3')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex justify-end gap-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.07]">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-xl border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--ut-orange)] px-5 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition shadow-sm disabled:opacity-60"
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          {submitting ? 'Enregistrement...' : 'Enregistrer la facture'}
        </button>
      </div>
    </form>
  )
}
