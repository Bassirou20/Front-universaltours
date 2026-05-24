import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CalendarDays, FileText, StickyNote, Building2, Hash, Loader2 } from 'lucide-react'
import { cx } from '../../lib/helpers'
import { CAT_CONFIG } from './DepenseDetails'
import type { DepenseCategorie } from './DepenseDetails'

const Categories = [
  'billet_externe',
  'hotel_externe',
  'transport',
  'bureau',
  'marketing',
  'salaires',
  'autre',
] as const

const Status = ['paye', 'en_attente'] as const

const schema = z
  .object({
    date_depense: z.string().min(1, 'Date requise'),
    categorie: z.enum(Categories, { errorMap: () => ({ message: 'Catégorie requise' }) }),
    libelle: z.string().min(1, 'Libellé requis').max(190),
    fournisseur_nom: z.string().optional().nullable(),
    reference: z.string().optional().nullable(),
    montant: z.coerce.number().min(0, 'Montant invalide'),
    mode_paiement: z.string().optional().nullable(),
    statut: z.enum(Status).default('paye'),
    reservation_id: z.coerce.number().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .superRefine((v, ctx) => {
    const cat = v.categorie

    if (cat === 'billet_externe' || cat === 'hotel_externe') {
      if (!v.fournisseur_nom || !v.fournisseur_nom.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fournisseur_nom'],
          message: 'Le fournisseur est requis pour une dépense externe.',
        })
      }
    }

    if (cat === 'billet_externe') {
      if (!v.reference || !v.reference.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reference'],
          message: 'La référence du billet est requise (numéro billet / facture).',
        })
      }
    }

    if (cat === 'salaires') {
      if (!v.notes || !v.notes.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['notes'],
          message: 'Notes requises (ex: Employé + mois).',
        })
      }
    }
  })

export type DepenseInput = z.infer<typeof schema>

const MODE_PAIEMENT = [
  { value: 'cash', label: 'Cash', emoji: '💵' },
  { value: 'carte', label: 'Carte', emoji: '💳' },
  { value: 'virement', label: 'Virement', emoji: '🏦' },
  { value: 'wave', label: 'Wave', emoji: '🌊' },
  { value: 'orange_money', label: 'Orange Money', emoji: '🟠' },
  { value: 'free_money', label: 'Free Money', emoji: '🟣' },
  { value: 'cheque', label: 'Chèque', emoji: '📄' },
  { value: 'autre', label: 'Autre', emoji: '—' },
]

const inputBase = (hasError?: boolean) =>
  cx(
    'w-full rounded-xl border py-1.5 text-sm transition-all',
    'bg-white dark:bg-[#1c2535]',
    'text-gray-900 dark:text-gray-100',
    'placeholder-gray-400 dark:placeholder-gray-600',
    'focus:outline-none focus:ring-2 focus:ring-[var(--ut-orange)]/20 focus:border-[var(--ut-orange)]',
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

export default function DepensesForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitting,
}: {
  defaultValues?: Partial<DepenseInput>
  onSubmit: (vals: DepenseInput) => void
  onCancel: () => void
  submitting?: boolean
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<DepenseInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      statut: 'paye',
      date_depense: new Date().toISOString().slice(0, 10),
      ...defaultValues,
    },
  })

  const categorie = watch('categorie')
  const statut = watch('statut')
  const modePaiement = watch('mode_paiement')

  const ui = useMemo(() => {
    const showFournisseur = categorie === 'billet_externe' || categorie === 'hotel_externe'

    const libellePh =
      categorie === 'billet_externe'
        ? 'Ex: Achat billet Dakar–Paris (chez Agence X)'
        : categorie === 'hotel_externe'
          ? 'Ex: Réservation hôtel (via fournisseur)'
          : categorie === 'transport'
            ? 'Ex: Taxi / Carburant / Livraison'
            : categorie === 'bureau'
              ? 'Ex: Internet / Loyer / Fournitures'
              : categorie === 'marketing'
                ? 'Ex: Sponsor Facebook / Affiche / Publicité'
                : categorie === 'salaires'
                  ? 'Ex: Salaire - Janvier 2026'
                  : 'Ex: Dépense diverse'

    const fournisseurPh =
      categorie === 'billet_externe'
        ? 'Ex: Agence partenaire (où le billet est émis)'
        : 'Ex: Hôtel / Agence partenaire'

    const referencePh =
      categorie === 'billet_externe'
        ? 'Ex: N° billet / facture fournisseur'
        : 'Ex: N° facture / référence'

    const notesPh =
      categorie === 'salaires'
        ? 'Ex: Employé: John Doe • Mois: Janvier 2026 • Observations...'
        : categorie === 'marketing'
          ? 'Ex: Campagne: Facebook • Période: ... • Objectif...'
          : 'Notes (optionnel)'

    return { showFournisseur, libellePh, fournisseurPh, referencePh, notesPh }
  }, [categorie])

  const handleCategorieChange = (value: DepenseCategorie) => {
    setValue('categorie', value)
    if (value !== 'billet_externe' && value !== 'hotel_externe') {
      setValue('fournisseur_nom', '')
      setValue('reference', '')
    }
    if (value !== 'billet_externe') {
      setValue('reservation_id', null)
    }
  }

  return (
    <form onSubmit={handleSubmit((vals) => onSubmit(vals))} className="space-y-5">

      <div className="space-y-3">
        <SectionTitle>
          <FileText size={12} className="inline mr-1" />
          Informations
        </SectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Date <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                {...register('date_depense')}
                className={cx(inputBase(!!errors.date_depense), 'pl-9 pr-3')}
              />
            </div>
            <FieldError message={errors.date_depense?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Libellé <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                {...register('libelle')}
                placeholder={ui.libellePh}
                className={cx(inputBase(!!errors.libelle), 'pl-9 pr-3')}
              />
            </div>
            <FieldError message={errors.libelle?.message} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle>Catégorie</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {(Object.keys(CAT_CONFIG) as DepenseCategorie[]).map((key) => {
            const conf = CAT_CONFIG[key]
            const CatIcon = conf.icon
            const isSelected = categorie === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleCategorieChange(key)}
                className={cx(
                  'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-all',
                  isSelected
                    ? cx('border-transparent', conf.badge)
                    : 'border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20 bg-transparent',
                )}
              >
                <CatIcon size={16} />
                <span className="text-center leading-tight">{conf.label}</span>
              </button>
            )
          })}
        </div>
        <FieldError message={errors.categorie?.message} />
      </div>

      <div className="space-y-3">
        <SectionTitle>Montant &amp; Paiement</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Montant <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('montant')}
                placeholder="0"
                className={cx(inputBase(!!errors.montant), 'pl-3 pr-14 font-mono')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">
                XOF
              </span>
            </div>
            <FieldError message={errors.montant?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Statut
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValue('statut', 'paye')}
                className={cx(
                  'flex-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                  statut === 'paye'
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20',
                )}
              >
                Payé
              </button>
              <button
                type="button"
                onClick={() => setValue('statut', 'en_attente')}
                className={cx(
                  'flex-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                  statut === 'en_attente'
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20',
                )}
              >
                En attente
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle>Mode de paiement</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {MODE_PAIEMENT.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setValue('mode_paiement', modePaiement === m.value ? null : m.value)}
              className={cx(
                'flex flex-col items-center gap-1 rounded-xl border px-2 py-1.5 text-xs font-medium transition-all',
                modePaiement === m.value
                  ? 'border-[var(--ut-orange)] bg-[var(--ut-orange)]/10 text-[var(--ut-orange)]'
                  : 'border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20',
              )}
            >
              <span className="text-base">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {ui.showFournisseur && (
        <div className="space-y-3">
          <SectionTitle>Fournisseur &amp; Référence</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Fournisseur <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  {...register('fournisseur_nom')}
                  placeholder={ui.fournisseurPh}
                  className={cx(inputBase(!!errors.fournisseur_nom), 'pl-9 pr-3')}
                />
              </div>
              <FieldError message={errors.fournisseur_nom?.message} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Référence{categorie === 'billet_externe' && <span className="text-red-400"> *</span>}
              </label>
              <div className="relative">
                <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  {...register('reference')}
                  placeholder={ui.referencePh}
                  className={cx(inputBase(!!errors.reference), 'pl-9 pr-3')}
                />
              </div>
              <FieldError message={errors.reference?.message} />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <SectionTitle>
          <StickyNote size={12} className="inline mr-1" />
          Notes
        </SectionTitle>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {categorie === 'salaires' ? (
              <>Notes <span className="text-red-400">*</span></>
            ) : (
              <>Notes <span className="text-xs font-normal text-gray-400">(optionnel)</span></>
            )}
          </label>
          <div className="relative">
            <StickyNote size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
            <textarea
              {...register('notes')}
              placeholder={ui.notesPh}
              rows={3}
              className={cx(inputBase(!!errors.notes), 'pl-9 pr-3 resize-none')}
            />
          </div>
          <FieldError message={errors.notes?.message} />
        </div>
      </div>

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
          {submitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}
