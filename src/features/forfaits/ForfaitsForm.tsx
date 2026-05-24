import React, { useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { User, Users, Home, CalendarDays, Loader2 } from 'lucide-react'

// ─── Schema ───────────────────────────────────────────────────────────────────

const baseSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  description: z.string().nullish(),
  event_id: z.coerce.number().int().positive('Événement requis'),
  nombre_max_personnes: z.coerce.number().int().min(1, 'Minimum 1 personne'),
  type: z.enum(['solo', 'couple', 'famille']),
  actif: z.boolean().default(true),
  devise: z.string().default('XOF').optional(),
  prix: z.coerce.number().min(0).optional(),
  prix_adulte: z.coerce.number().min(0).optional(),
  prix_enfant: z.coerce.number().min(0).optional(),
})

const schema = baseSchema.superRefine((vals, ctx) => {
  if (vals.type === 'famille') {
    if (vals.prix_adulte == null || isNaN(vals.prix_adulte)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Prix adulte requis', path: ['prix_adulte'] })
    }
    if (vals.prix_enfant == null || isNaN(vals.prix_enfant)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Prix enfant requis', path: ['prix_enfant'] })
    }
  } else {
    if (vals.prix == null || isNaN(vals.prix)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Prix requis', path: ['prix'] })
    }
  }
})

export type ForfaitFormVals = z.infer<typeof schema>

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  {
    value: 'solo' as const,
    label: 'Solo',
    sub: '1 personne',
    icon: User,
    active: 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300',
  },
  {
    value: 'couple' as const,
    label: 'Couple',
    sub: '2 personnes',
    icon: Users,
    active: 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300',
  },
  {
    value: 'famille' as const,
    label: 'Famille',
    sub: 'Adultes + enfants',
    icon: Home,
    active: 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300',
  },
] as const

const inputBase = 'w-full rounded-xl border border-black/[0.08] dark:border-white/[0.09] bg-white dark:bg-[#111827] px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-400/20 transition-all'

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
    {children}
  </p>
)

const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null

const PrixInput: React.FC<{
  label: string
  placeholder?: string
  error?: string
  inputProps: React.InputHTMLAttributes<HTMLInputElement>
}> = ({ label, placeholder, error, inputProps }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
      {label} <span className="text-red-400">*</span>
    </label>
    <div className="relative">
      <input
        type="number"
        step="1"
        min="0"
        placeholder={placeholder ?? '0'}
        {...inputProps}
        className={`${inputBase} pr-12 font-mono text-base`}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
        XOF
      </span>
    </div>
    <FieldError msg={error} />
  </div>
)

// ─── Normalizer ───────────────────────────────────────────────────────────────

const normalizeList = (input: unknown): unknown[] => {
  if (!input) return []
  if (Array.isArray(input)) return input
  const r = input as Record<string, unknown>
  if (Array.isArray(r?.data)) {
    const d = r.data as unknown[]
    if (d.length > 0 && Array.isArray((d[0] as Record<string, unknown>)?.data)) return []
    return d
  }
  if (Array.isArray((r?.data as Record<string, unknown>)?.data))
    return (r?.data as Record<string, unknown>)?.data as unknown[]
  if (Array.isArray(r?.items)) return r.items as unknown[]
  return []
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export const ForfaitsForm: React.FC<{
  defaultValues?: Partial<ForfaitFormVals>
  onSubmit: (vals: ForfaitFormVals) => void
  onCancel: () => void
  submitting?: boolean
}> = ({ defaultValues, onSubmit, onCancel, submitting }) => {
  const { register, handleSubmit, control, formState: { errors }, watch } = useForm<ForfaitFormVals>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'solo',
      actif: true,
      nombre_max_personnes: 1,
      ...defaultValues,
    } as ForfaitFormVals,
  })

  const typeVal = watch('type')

  const qProds = useQuery({
    queryKey: ['produits-simple'],
    queryFn: async () => (await api.get('/produits', { params: { simple: 1 } })).data,
  })

  const eventsOnly = useMemo(() => {
    return (normalizeList(qProds.data) as Record<string, unknown>[])
      .filter(p => p.type === 'evenement')
  }, [qProds.data])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-1">

      {/* ── Type ── */}
      <div>
        <SectionTitle>Type de forfait</SectionTitle>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TYPE_OPTIONS.map(({ value, label, sub, icon: Icon, active }) => {
                const selected = field.value === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    className={[
                      'flex flex-col items-center gap-2 rounded-xl border px-3 py-3.5 text-center transition-all',
                      selected
                        ? active
                        : 'border-black/[0.08] dark:border-white/[0.09] bg-white dark:bg-[#111827] text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20',
                    ].join(' ')}
                  >
                    <span className={[
                      'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                      selected ? 'bg-white/50 dark:bg-white/10' : 'bg-black/[0.04] dark:bg-white/[0.05]',
                    ].join(' ')}>
                      <Icon size={18} />
                    </span>
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-[11px] opacity-60">{sub}</span>
                  </button>
                )
              })}
            </div>
          )}
        />
      </div>

      {/* ── Informations ── */}
      <div>
        <SectionTitle>Informations</SectionTitle>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Nom du forfait <span className="text-red-400">*</span>
            </label>
            <input
              {...register('nom')}
              placeholder="ex: Week-end romantique à Saly"
              className={inputBase}
            />
            <FieldError msg={errors.nom?.message} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Détails, inclusions, conditions particulières…"
              className={`${inputBase} resize-none`}
            />
          </div>
        </div>
      </div>

      {/* ── Événement & Capacité ── */}
      <div>
        <SectionTitle>Rattachement & Capacité</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={12} />
                Événement <span className="text-red-400">*</span>
              </span>
            </label>
            <select
              {...register('event_id', { valueAsNumber: true })}
              className={inputBase}
            >
              <option value="">— Choisir un événement —</option>
              {eventsOnly.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nom || p.name}
                </option>
              ))}
            </select>
            <FieldError msg={errors.event_id?.message} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Capacité max <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                {...register('nombre_max_personnes', { valueAsNumber: true })}
                className={`${inputBase} pr-24`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                personne{watch('nombre_max_personnes') > 1 ? 's' : ''}
              </span>
            </div>
            <FieldError msg={errors.nombre_max_personnes?.message} />
          </div>
        </div>
      </div>

      {/* ── Tarification ── */}
      <div>
        <SectionTitle>Tarification</SectionTitle>
        {typeVal === 'famille' ? (
          <div className="grid grid-cols-2 gap-3">
            <PrixInput
              label="Prix adulte"
              inputProps={register('prix_adulte', { valueAsNumber: true })}
              error={errors.prix_adulte?.message}
            />
            <PrixInput
              label="Prix enfant"
              inputProps={register('prix_enfant', { valueAsNumber: true })}
              error={errors.prix_enfant?.message}
            />
          </div>
        ) : (
          <div className="max-w-xs">
            <PrixInput
              label={typeVal === 'couple' ? 'Prix par couple' : 'Prix par personne'}
              inputProps={register('prix', { valueAsNumber: true })}
              error={errors.prix?.message}
            />
          </div>
        )}
      </div>

      {/* ── Statut ── */}
      <div>
        <SectionTitle>Statut</SectionTitle>
        <Controller
          name="actif"
          control={control}
          render={({ field }) => (
            <div className="flex gap-2">
              {[
                { val: true,  label: 'Actif',   cls: 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300' },
                { val: false, label: 'Inactif', cls: 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300' },
              ].map(opt => (
                <button
                  key={String(opt.val)}
                  type="button"
                  onClick={() => field.onChange(opt.val)}
                  className={[
                    'px-5 py-1.5 rounded-xl border text-sm font-medium transition-all',
                    field.value === opt.val
                      ? opt.cls
                      : 'border-black/[0.08] dark:border-white/[0.09] bg-white dark:bg-[#111827] text-gray-500 hover:border-black/20 dark:hover:border-white/20',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex justify-end gap-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 rounded-xl text-sm font-medium border border-black/[0.08] dark:border-white/[0.09] text-gray-600 dark:text-gray-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-1.5 rounded-xl text-sm font-semibold bg-[var(--ut-orange)] text-white hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Enregistrer
        </button>
      </div>
    </form>
  )
}

export default ForfaitsForm
