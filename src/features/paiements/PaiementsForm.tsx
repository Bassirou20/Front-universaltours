import React, { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Row } from '../../ui/Form'
import type { PaiementModel } from './PaiementDetails'

const schema = z.object({
  facture_id: z.coerce.number().int().positive('Facture requise'),
  date_paiement: z.string().optional().nullable(),
  montant: z.coerce.number().min(1, 'Montant requis'),
  mode_paiement: z.enum(['especes', 'orange_money', 'wave', 'carte', 'virement', 'cheque', 'free_money']).or(z.string().min(1)),
  reference: z.string().optional().nullable(),
  statut: z.enum(['recu', 'en_attente', 'annule']).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type PaiementInput = z.infer<typeof schema>

export type FactureOption = {
  id: number
  numero?: string | null
  total?: number | null
  statut?: string | null
}

const MODE_LABEL: Record<string, string> = {
  especes: 'Espèces',
  orange_money: 'Orange Money',
  wave: 'Wave',
  carte: 'Carte',
  virement: 'Virement',
  cheque: 'Chèque',
  free_money: 'Free Money',
}

const STATUT_LABEL: Record<string, string> = {
  recu: 'Reçu',
  en_attente: 'En attente',
  annule: 'Annulé',
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const money = (n: any, devise = 'XOF') => `${Number(n || 0).toLocaleString()} ${devise}`

export const PaiementsForm: React.FC<{
  factures: FactureOption[]
  paiements?: PaiementModel[]
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
      statut: 'recu',
      montant: 0,
      reference: '',
      notes: '',
      ...defaultValues,
    } as any,
  })

  const selectedFactureId = watch('facture_id')
  const currentAmount = watch('montant')

  const selectedFacture = useMemo(
    () => factures.find((f) => f.id === Number(selectedFactureId)),
    [factures, selectedFactureId]
  )

  // ✅ backend: on ne compte que les paiements "recu"
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
  const remaining = Math.max(0, factureTotal - paidForSelected)

  useEffect(() => {
    const isEditing = Boolean(defaultValues && (defaultValues as any)?.montant != null && Number((defaultValues as any).montant) > 0)
    if (isEditing) return
    if (!selectedFactureId) return
    if (Number(currentAmount || 0) > 0) return
    if (factureTotal > 0) {
      const suggested = remaining > 0 ? remaining : factureTotal
      setValue('montant', Number(suggested.toFixed(2)) as any, { shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFactureId])

  return (
    <form onSubmit={handleSubmit((vals) => onSubmit(vals))} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Facture">
          <select className="input" {...register('facture_id')}>
            <option value="">— Sélectionner —</option>
            {factures.map((f) => (
              <option key={f.id} value={f.id}>
                {f.numero ? f.numero : `Facture #${f.id}`} {f.total != null ? `• ${Number(f.total).toLocaleString()} XOF` : ''}
              </option>
            ))}
          </select>
          {errors.facture_id && <p className="text-red-600 text-xs mt-1">{String(errors.facture_id.message)}</p>}

          {selectedFacture ? (
            <div className="mt-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3 text-xs space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600 dark:text-gray-400">Statut facture</span>
                <span className="font-medium">{selectedFacture.statut ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600 dark:text-gray-400">Total</span>
                <span className="font-medium">{money(selectedFacture.total ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600 dark:text-gray-400">Déjà payé (reçu)</span>
                <span className="font-medium">{money(paidForSelected)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600 dark:text-gray-400">Reste estimé</span>
                <span className="font-semibold">{money(remaining)}</span>
              </div>
            </div>
          ) : null}
        </Row>

        <Row label="Date de paiement">
          <input type="date" className="input" {...register('date_paiement')} />
          {errors.date_paiement && <p className="text-red-600 text-xs mt-1">{String(errors.date_paiement.message)}</p>}
        </Row>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Row label="Montant (XOF)">
          <input type="number" step="0.01" className="input" {...register('montant', { valueAsNumber: true })} />
          {errors.montant && <p className="text-red-600 text-xs mt-1">{String(errors.montant.message)}</p>}
          {selectedFacture ? <p className="text-xs text-gray-500 mt-1">Suggestion: {money(remaining)} (reste estimé)</p> : null}
        </Row>

        <Row label="Mode de paiement">
          <select className="input" {...register('mode_paiement' as any)}>
            {Object.entries(MODE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {errors.mode_paiement && <p className="text-red-600 text-xs mt-1">{String(errors.mode_paiement.message)}</p>}
        </Row>

        <Row label="Statut">
          <select className="input" {...register('statut')}>
            <option value="recu">{STATUT_LABEL.recu}</option>
            <option value="en_attente">{STATUT_LABEL.en_attente}</option>
            <option value="annule">{STATUT_LABEL.annule}</option>
          </select>
          {errors.statut && <p className="text-red-600 text-xs mt-1">{String(errors.statut.message)}</p>}
        </Row>
      </div>

      <Row label="Référence (optionnel)">
        <input className="input" placeholder="Transaction / reçu / code…" {...register('reference')} />
      </Row>

      <Row label="Notes (optionnel)">
        <textarea className="input" rows={3} placeholder="Ex: paiement partiel, remise, détails…" {...register('notes')} />
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
