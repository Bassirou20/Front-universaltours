import React, { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Row } from '../../ui/Form'
import type { PaiementModel } from './PaiementDetails'

const schema = z.object({
  facture_id: z.coerce.number().int().positive('Facture requise'),
  date_paiement: z.string().min(1, 'Date requise'),
  montant: z.coerce.number().min(1, 'Montant requis'),
  mode_paiement: z.enum(['especes', 'orange_money', 'wave', 'carte', 'virement', 'cheque'], {
    required_error: 'Mode requis',
  }),
  reference: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})

export type PaiementInput = z.infer<typeof schema>

export type FactureOption = {
  id: number
  numero?: string | null
  total?: number | null
  statut?: string | null
}

const MODE_LABEL: Record<PaiementInput['mode_paiement'], string> = {
  especes: 'Espèces',
  orange_money: 'Orange Money',
  wave: 'Wave',
  carte: 'Carte',
  virement: 'Virement',
  cheque: 'Chèque',
}

const todayISO = () => new Date().toISOString().slice(0, 10)

const money = (n: any, devise = 'XOF') => `${Number(n || 0).toLocaleString()} ${devise}`

export const PaiementsForm: React.FC<{
  factures: FactureOption[]
  paiements?: PaiementModel[] // ✅ pour calculer "reste estimé"
  defaultValues?: Partial<PaiementInput>
  onSubmit: (vals: PaiementInput) => void
  onCancel: () => void
  submitting?: boolean
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
      montant: 0,
      ...defaultValues,
    },
  })

  const selectedFactureId = watch('facture_id')
  const currentAmount = watch('montant')

  const selectedFacture = useMemo(
    () => factures.find((f) => f.id === Number(selectedFactureId)),
    [factures, selectedFactureId]
  )

  const paidForSelected = useMemo(() => {
    const fid = Number(selectedFactureId)
    if (!fid) return 0
    return paiements.reduce((acc, p) => (Number(p.facture_id) === fid ? acc + Number(p.montant || 0) : acc), 0)
  }, [paiements, selectedFactureId])

  const factureTotal = Number(selectedFacture?.total ?? 0)
  const remaining = Math.max(0, factureTotal - paidForSelected)

  // ✅ UX: si on choisit une facture et que montant est 0 (nouveau), on propose le "reste estimé"
  useEffect(() => {
    const isEditing = Boolean(defaultValues && (defaultValues as any)?.montant != null && Number((defaultValues as any).montant) > 0)
    if (isEditing) return
    if (!selectedFactureId) return
    if (Number(currentAmount || 0) > 0) return

    if (factureTotal > 0) {
      const suggested = remaining > 0 ? remaining : factureTotal
      setValue('montant', Number(suggested.toFixed(2)) as any, { shouldValidate: true })
    }
  }, [selectedFactureId]) // volontairement: au changement de facture

  return (
    <form onSubmit={handleSubmit((vals) => onSubmit(vals))} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Facture">
          <select className="input" {...register('facture_id')}>
            <option value="">— Sélectionner —</option>
            {factures.map((f) => (
              <option key={f.id} value={f.id}>
                {f.numero ? f.numero : `Facture #${f.id}`}{' '}
                {f.total != null ? `• ${Number(f.total).toLocaleString()} XOF` : ''}
              </option>
            ))}
          </select>
          {errors.facture_id && <p className="text-red-600 text-xs mt-1">{String(errors.facture_id.message)}</p>}

          {selectedFacture ? (
            <div className="mt-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3 text-xs space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600 dark:text-gray-400">Statut</span>
                <span className="font-medium">{selectedFacture.statut ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600 dark:text-gray-400">Total</span>
                <span className="font-medium">{money(selectedFacture.total ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600 dark:text-gray-400">Déjà payé (estimé)</span>
                <span className="font-medium">{money(paidForSelected)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600 dark:text-gray-400">Reste (estimé)</span>
                <span className="font-semibold">{money(remaining)}</span>
              </div>
              <div className="text-[11px] text-gray-500 pt-1">
                * Estimation basée sur les paiements chargés (si ton API renvoie bien tous les paiements).
              </div>
            </div>
          ) : null}
        </Row>

        <Row label="Date de paiement">
          <input type="date" className="input" {...register('date_paiement')} />
          {errors.date_paiement && <p className="text-red-600 text-xs mt-1">{String(errors.date_paiement.message)}</p>}
        </Row>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Montant (XOF)">
          <input type="number" step="0.01" className="input" {...register('montant', { valueAsNumber: true })} />
          {errors.montant && <p className="text-red-600 text-xs mt-1">{String(errors.montant.message)}</p>}
          {selectedFacture ? (
            <p className="text-xs text-gray-500 mt-1">
              Suggestion: {money(remaining)} (reste estimé)
            </p>
          ) : null}
        </Row>

        <Row label="Mode de paiement">
          <select className="input" {...register('mode_paiement')}>
            {Object.entries(MODE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {errors.mode_paiement && <p className="text-red-600 text-xs mt-1">{String(errors.mode_paiement.message)}</p>}
        </Row>
      </div>

      <Row label="Référence (optionnel)">
        <input className="input" placeholder="Transaction / reçu / code…" {...register('reference')} />
      </Row>

      <Row label="Note (optionnel)">
        <textarea className="input" rows={3} placeholder="Ex: paiement partiel, remise, détails…" {...register('note')} />
      </Row>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          Enregistrer
        </button>
      </div>
    </form>
  )
}

export default PaiementsForm
