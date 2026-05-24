import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle, Calendar, Hash, StickyNote, Loader2,
  Banknote, CreditCard, Building2, Smartphone, FileText,
} from 'lucide-react'

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')

const MODES = [
  { value: 'especes',      label: 'Espèces',      icon: <Banknote size={16} /> },
  { value: 'carte',        label: 'Carte',        icon: <CreditCard size={16} /> },
  { value: 'virement',     label: 'Virement',     icon: <Building2 size={16} /> },
  { value: 'wave',         label: 'Wave',         icon: <Smartphone size={16} /> },
  { value: 'orange_money', label: 'Orange Money', icon: <Smartphone size={16} /> },
  { value: 'free_money',   label: 'Free Money',   icon: <Smartphone size={16} /> },
  { value: 'cheque',       label: 'Chèque',       icon: <FileText size={16} /> },
]

const schema = z.object({
  montant:       z.number({ invalid_type_error: 'Le montant est requis' }).positive('Le montant doit etre > 0'),
  mode_paiement: z.enum(['especes', 'carte', 'virement', 'wave', 'orange_money', 'free_money', 'cheque']),
  reference:     z.string().max(100).optional(),
  date_paiement: z.string().optional(),
  notes:         z.string().optional(),
})

export type AddPaymentInput = z.infer<typeof schema>

const inputClass = (hasError?: boolean) => cx(
  'w-full rounded-xl border py-1.5 text-sm transition-all',
  'bg-white dark:bg-[#1c2535]',
  'text-gray-900 dark:text-gray-100',
  'placeholder-gray-400 dark:placeholder-gray-600',
  'focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400 dark:focus:border-sky-500',
  hasError
    ? 'border-red-400 dark:border-red-500'
    : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20',
)

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 mt-1.5 text-xs text-red-500">
      <AlertCircle size={11} className="shrink-0" /> {message}
    </p>
  )
}

const MODE_COLORS: Record<string, { active: string; idle: string }> = {
  especes:      { active: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', idle: '' },
  carte:        { active: 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300', idle: '' },
  virement:     { active: 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300', idle: '' },
  wave:         { active: 'border-sky-500 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300', idle: '' },
  orange_money: { active: 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300', idle: '' },
  free_money:   { active: 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300', idle: '' },
  cheque:       { active: 'border-gray-500 bg-gray-50 dark:bg-gray-500/10 text-gray-700 dark:text-gray-300', idle: '' },
}

export const AddPaymentForm: React.FC<{
  defaultValues?: Partial<AddPaymentInput>
  onSubmit: (vals: AddPaymentInput) => void
  onCancel: () => void
  submitting?: boolean
}> = ({ defaultValues, onSubmit, onCancel, submitting }) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<AddPaymentInput>({
    resolver: zodResolver(schema),
    defaultValues: { mode_paiement: 'especes', ...defaultValues },
  })

  const mode = watch('mode_paiement')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* ── Montant ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Montant <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            {...register('montant', { valueAsNumber: true })}
            placeholder="0"
            className={cx(inputClass(!!errors.montant), 'pl-3 pr-14 font-mono text-base font-semibold')}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 dark:text-gray-500 pointer-events-none">
            XOF
          </span>
        </div>
        <FieldError message={errors.montant?.message} />
      </div>

      {/* ── Mode de paiement ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Mode de paiement <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {MODES.map((m) => {
            const colors = MODE_COLORS[m.value]
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setValue('mode_paiement', m.value as AddPaymentInput['mode_paiement'])}
                className={cx(
                  'flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-xs font-semibold transition-all',
                  mode === m.value
                    ? cx('shadow-sm', colors?.active ?? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300')
                    : 'border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5',
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/[0.04] dark:bg-white/[0.06]">
                  {m.icon}
                </span>
                <span className="truncate w-full text-center leading-tight">{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Reference & Date ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Référence <span className="text-xs font-normal text-gray-400">(optionnel)</span>
          </label>
          <div className="relative">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              {...register('reference')}
              placeholder="N° reçu / réf..."
              className={cx(inputClass(), 'pl-9 pr-3')}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Date paiement <span className="text-xs font-normal text-gray-400">(optionnel)</span>
          </label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="date"
              {...register('date_paiement')}
              className={cx(inputClass(), 'pl-9 pr-3')}
            />
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Notes <span className="text-xs font-normal text-gray-400">(optionnel)</span>
        </label>
        <div className="relative">
          <StickyNote size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Remarques, détails..."
            className={cx(inputClass(), 'pl-9 pr-3 py-1.5 resize-none')}
          />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex justify-end gap-2 pt-1 border-t border-black/[0.05] dark:border-white/[0.07]">
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
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition shadow-sm disabled:opacity-60"
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          {submitting ? 'Enregistrement...' : 'Ajouter le paiement'}
        </button>
      </div>
    </form>
  )
}
