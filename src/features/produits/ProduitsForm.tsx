import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plane, Building2, Car, CalendarDays, Loader2 } from 'lucide-react'

const schema = z.object({
  type: z.enum(['billet_avion', 'hotel', 'voiture', 'evenement'], { required_error: 'Type requis' }),
  nom: z.string().min(1, 'Nom requis').max(150, '150 caractères max'),
  description: z.string().nullish(),
  prix_base: z.coerce.number().min(0, 'Doit être ≥ 0'),
  actif: z.boolean().default(true),
})

export type ProduitInput = z.infer<typeof schema>

const TYPE_OPTIONS = [
  { value: 'billet_avion', label: "Billet d'avion", icon: Plane,        active: 'bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-300' },
  { value: 'hotel',        label: 'Hôtel',          icon: Building2,    active: 'bg-violet-500/10 border-violet-500 text-violet-700 dark:text-violet-300' },
  { value: 'voiture',      label: 'Voiture',        icon: Car,          active: 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300' },
  { value: 'evenement',    label: 'Événement',      icon: CalendarDays, active: 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300' },
] as const

const inputBase = 'w-full rounded-xl border border-black/[0.08] dark:border-white/[0.09] bg-white dark:bg-[#111827] px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-400/20 transition-all'

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
    {children}
  </p>
)

const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null

export const ProduitsForm: React.FC<{
  defaultValues?: Partial<ProduitInput>
  onSubmit: (vals: ProduitInput) => void
  onCancel: () => void
  submitting?: boolean
}> = ({ defaultValues, onSubmit, onCancel, submitting }) => {
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<ProduitInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'billet_avion',
      prix_base: 0,
      actif: true,
      ...defaultValues,
    },
  })

  const typeVal = watch('type')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-1">

      {/* ── Type ── */}
      <div>
        <SectionTitle>Type de service</SectionTitle>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(({ value, label, icon: Icon, active }) => {
                const selected = field.value === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    className={[
                      'flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all',
                      selected
                        ? active
                        : 'border-black/[0.08] dark:border-white/[0.09] bg-white dark:bg-[#111827] text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20',
                    ].join(' ')}
                  >
                    <span className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                      selected ? 'bg-white/50 dark:bg-white/10' : 'bg-black/[0.04] dark:bg-white/[0.05]',
                    ].join(' ')}>
                      <Icon size={16} />
                    </span>
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                )
              })}
            </div>
          )}
        />
        <FieldError msg={errors.type?.message} />
      </div>

      {/* ── Nom ── */}
      <div>
        <SectionTitle>Informations</SectionTitle>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Nom du service <span className="text-red-400">*</span>
            </label>
            <input
              {...register('nom')}
              placeholder={
                typeVal === 'billet_avion' ? 'ex: Vol Dakar — Paris'
                : typeVal === 'hotel' ? 'ex: Hôtel Terrou-Bi'
                : typeVal === 'voiture' ? 'ex: Location Toyota Corolla'
                : 'ex: Festival Dakar Vibes 2026'
              }
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
              placeholder="Détails du service, conditions, inclusions…"
              className={`${inputBase} resize-none`}
            />
          </div>
        </div>
      </div>

      {/* ── Prix & Statut ── */}
      <div>
        <SectionTitle>Tarif & Statut</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Prix de base <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                {...register('prix_base', { valueAsNumber: true })}
                className={`${inputBase} pr-12 font-mono text-base`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                XOF
              </span>
            </div>
            <FieldError msg={errors.prix_base?.message} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Statut
            </label>
            <Controller
              name="actif"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  {[{ val: true, label: 'Actif', cls: 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300' },
                    { val: false, label: 'Inactif', cls: 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300' }].map(opt => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => field.onChange(opt.val)}
                      className={[
                        'flex-1 rounded-xl border px-3 py-1.5 text-sm font-medium transition-all',
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
        </div>

        {typeVal === 'evenement' && (
          <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-3 py-2">
            Les forfaits (solo, couple, famille) se rattachent aux services de type Événement.
          </p>
        )}
        {typeVal === 'billet_avion' && (
          <p className="mt-2 text-xs text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 rounded-lg px-3 py-2">
            Les options bagage et escales se gèrent dans les lignes de réservation.
          </p>
        )}
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

export default ProduitsForm
