import React, { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Loader2, Banknote, CreditCard, Building2, Smartphone, FileText,
  ArrowRight, CheckCircle2,
} from 'lucide-react'
import { Row } from '../../ui/Form'
import type { PaiementModel } from './PaiementDetails'

const schema = z.object({
  facture_id:    z.coerce.number().int().positive('Facture requise'),
  date_paiement: z.string().optional().nullable(),
  montant:       z.coerce.number().min(1, 'Montant requis'),
  mode_paiement: z.enum(['especes', 'orange_money', 'wave', 'carte', 'virement', 'cheque', 'free_money']).or(z.string().min(1)),
  reference:     z.string().optional().nullable(),
  statut:        z.enum(['recu', 'en_attente', 'annule']).optional().nullable(),
  notes:         z.string().optional().nullable(),
})

export type PaiementInput = z.infer<typeof schema>

export type FactureOption = {
  id: number
  numero?: string | null
  total?: number | null
  statut?: string | null
}

// ─── Mode config ─────────────────────────────────────────────────────────────

const MODES: Array<{
  value: string
  label: string
  icon: React.ReactNode
  activeClass: string
}> = [
  {
    value: 'especes',
    label: 'Espèces',
    icon: <Banknote size={17} />,
    activeClass: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm',
  },
  {
    value: 'orange_money',
    label: 'Orange Money',
    icon: <Smartphone size={17} />,
    activeClass: 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 shadow-sm',
  },
  {
    value: 'wave',
    label: 'Wave',
    icon: <Smartphone size={17} />,
    activeClass: 'border-sky-500 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 shadow-sm',
  },
  {
    value: 'carte',
    label: 'Carte',
    icon: <CreditCard size={17} />,
    activeClass: 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 shadow-sm',
  },
  {
    value: 'virement',
    label: 'Virement',
    icon: <Building2 size={17} />,
    activeClass: 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-sm',
  },
  {
    value: 'cheque',
    label: 'Chèque',
    icon: <FileText size={17} />,
    activeClass: 'border-gray-500 bg-gray-50 dark:bg-gray-500/10 text-gray-700 dark:text-gray-300 shadow-sm',
  },
  {
    value: 'free_money',
    label: 'Free Money',
    icon: <Smartphone size={17} />,
    activeClass: 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-sm',
  },
]

const STATUT_LABEL: Record<string, string> = {
  recu:        'Reçu',
  en_attente:  'En attente',
  annule:      'Annulé',
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const money = (n: any) => `${Number(n || 0).toLocaleString('fr-FR')} XOF`

// ─── Progress bar ─────────────────────────────────────────────────────────────

function FactureProgress({
  total, paid, remaining, currentAmount,
}: {
  total: number; paid: number; remaining: number; currentAmount: number
}) {
  const paidPct     = total > 0 ? Math.min(100, (paid / total) * 100) : 0
  const currentPct  = total > 0 ? Math.min(100 - paidPct, (currentAmount / total) * 100) : 0
  const afterPct    = paidPct + currentPct
  const isFullyPaid = afterPct >= 99.9

  return (
    <div className="mt-3 space-y-2">
      <div className="h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.07] overflow-hidden flex">
        <div
          className="h-full rounded-l-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${paidPct}%` }}
        />
        {currentPct > 0 && (
          <div
            className="h-full bg-sky-400 transition-all duration-500"
            style={{ width: `${currentPct}%` }}
          />
        )}
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Payé {money(paid)}
          {currentAmount > 0 && (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400 ml-1" />
              + {money(currentAmount)}
            </>
          )}
        </div>
        {isFullyPaid ? (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={11} /> Soldé
          </span>
        ) : (
          <span>Reste {money(Math.max(0, remaining - currentAmount))}</span>
        )}
      </div>
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export const PaiementsForm: React.FC<{
  factures:      FactureOption[]
  paiements?:    PaiementModel[]
  defaultValues?: Partial<PaiementInput>
  onSubmit:      (vals: PaiementInput) => void
  onCancel:      () => void
  submitting?:   boolean
}> = ({ factures, paiements = [], defaultValues, onSubmit, onCancel, submitting }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<PaiementInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      date_paiement: todayISO(),
      mode_paiement: 'especes',
      statut:        'recu',
      montant:       0,
      reference:     '',
      notes:         '',
      ...defaultValues,
    } as any,
  })

  const selectedFactureId = watch('facture_id')
  const currentMode       = watch('mode_paiement')
  const currentAmount     = watch('montant')

  const selectedFacture = useMemo(
    () => factures.find((f) => f.id === Number(selectedFactureId)),
    [factures, selectedFactureId],
  )

  const paidForSelected = useMemo(() => {
    const fid = Number(selectedFactureId)
    if (!fid) return 0
    return paiements.reduce((acc, p) => {
      if (Number(p.facture_id) !== fid) return acc
      const st = String((p as any).statut ?? '').toLowerCase()
      if (!st || st === 'recu' || st === 'reçu') return acc + Number(p.montant || 0)
      return acc
    }, 0)
  }, [paiements, selectedFactureId])

  const factureTotal = Number(selectedFacture?.total ?? 0)
  const remaining    = Math.max(0, factureTotal - paidForSelected)

  // Auto-suggest remaining amount when a facture is first selected
  useEffect(() => {
    const isEditing = Boolean(
      defaultValues && (defaultValues as any)?.montant != null && Number((defaultValues as any).montant) > 0,
    )
    if (isEditing || !selectedFactureId || Number(currentAmount || 0) > 0) return
    if (factureTotal > 0) {
      setValue('montant', Number((remaining > 0 ? remaining : factureTotal).toFixed(2)) as any, { shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFactureId])

  const idleClass = 'border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.04]'

  return (
    <form onSubmit={handleSubmit((vals) => onSubmit(vals))} className="space-y-5">

      {/* ── Facture ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Row label="Facture">
            <select className="input" {...register('facture_id')}>
              <option value="">— Sélectionner —</option>
              {factures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.numero ?? `Facture #${f.id}`}
                  {f.total != null ? ` · ${Number(f.total).toLocaleString('fr-FR')} XOF` : ''}
                </option>
              ))}
            </select>
            {errors.facture_id && (
              <p className="text-red-600 text-xs mt-1">{String(errors.facture_id.message)}</p>
            )}

            {selectedFacture && (
              <div className="mt-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Total facture</span>
                  <span className="font-semibold">{money(selectedFacture.total)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Déjà reçu</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{money(paidForSelected)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Reste estimé</span>
                  <span className="font-semibold">{money(remaining)}</span>
                </div>
                <FactureProgress
                  total={factureTotal}
                  paid={paidForSelected}
                  remaining={remaining}
                  currentAmount={Number(currentAmount || 0)}
                />
              </div>
            )}
          </Row>
        </div>

        <Row label="Date de paiement">
          <input type="date" className="input" {...register('date_paiement')} />
          {errors.date_paiement && (
            <p className="text-red-600 text-xs mt-1">{String(errors.date_paiement.message)}</p>
          )}
        </Row>
      </div>

      {/* ── Montant + Statut ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Row label="Montant (XOF)">
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              className="input flex-1"
              {...register('montant', { valueAsNumber: true })}
            />
            {remaining > 0 && (
              <button
                type="button"
                title={`Remplir avec le reste : ${money(remaining)}`}
                className="btn bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 px-3 shrink-0 text-xs font-semibold inline-flex items-center gap-1"
                onClick={() => setValue('montant', Number(remaining.toFixed(2)) as any, { shouldValidate: true })}
              >
                <ArrowRight size={13} />
                Reste
              </button>
            )}
          </div>
          {errors.montant && (
            <p className="text-red-600 text-xs mt-1">{String(errors.montant.message)}</p>
          )}
        </Row>

        <Row label="Statut">
          <select className="input" {...register('statut')}>
            {Object.entries(STATUT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {errors.statut && (
            <p className="text-red-600 text-xs mt-1">{String(errors.statut.message)}</p>
          )}
        </Row>
      </div>

      {/* ── Mode de paiement ── */}
      <div>
        <label className="label mb-2 block">Mode de paiement</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setValue('mode_paiement', m.value as any, { shouldValidate: true })}
              className={[
                'flex flex-col items-center gap-1.5 rounded-xl border py-1.5 px-1.5 text-[11px] font-semibold transition-all',
                currentMode === m.value ? m.activeClass : idleClass,
              ].join(' ')}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/[0.04] dark:bg-white/[0.06]">
                {m.icon}
              </span>
              <span className="truncate w-full text-center leading-tight">{m.label}</span>
            </button>
          ))}
        </div>
        {errors.mode_paiement && (
          <p className="text-red-600 text-xs mt-1">{String(errors.mode_paiement.message)}</p>
        )}
      </div>

      {/* ── Référence + Notes ── */}
      <Row label="Référence (optionnel)">
        <input className="input" placeholder="Transaction / reçu / code…" {...register('reference')} />
      </Row>

      <Row label="Notes (optionnel)">
        <textarea className="input" rows={3} placeholder="Ex: paiement partiel, remise, détails…" {...register('notes')} />
      </Row>

      {/* ── Actions ── */}
      <div className="flex justify-end gap-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
        <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-2">
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Enregistrer
        </button>
      </div>
    </form>
  )
}

export default PaiementsForm
