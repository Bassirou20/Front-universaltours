// src/features/produits/ProduitsForm.tsx
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Row } from '../../ui/Form'

const schema = z.object({
  type: z.enum(['billet_avion', 'hotel', 'voiture', 'evenement'], { required_error: 'Type requis' }),
  nom: z.string().min(1, 'Nom requis').max(150, '150 caractères max'),
  description: z.string().nullish(),
  prix_base: z.coerce.number().min(0, 'Doit être ≥ 0'),
})

export type ProduitInput = z.infer<typeof schema>

export const ProduitsForm: React.FC<{
  defaultValues?: Partial<ProduitInput>
  onSubmit: (vals: ProduitInput) => void
  onCancel: () => void
  submitting?: boolean
}> = ({ defaultValues, onSubmit, onCancel, submitting }) => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<ProduitInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'billet_avion',
      prix_base: 0,
      ...defaultValues,
    },
  })

  const typeVal = watch('type')

  return (
    <form onSubmit={handleSubmit((vals) => onSubmit(vals))} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Type">
          <select className="input" {...register('type')}>
            <option value="billet_avion">Billet d’avion</option>
            <option value="hotel">Hôtel</option>
            <option value="voiture">Voiture</option>
            <option value="evenement">Événement</option>
          </select>
          {errors.type && <p className="text-red-600 text-xs mt-1">{String(errors.type.message)}</p>}
        </Row>

        <Row label="Nom">
          <input className="input" {...register('nom')} />
          {errors.nom && <p className="text-red-600 text-xs mt-1">{String(errors.nom.message)}</p>}
        </Row>
      </div>

      <Row label="Description">
        <textarea className="input" rows={3} {...register('description')} />
      </Row>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Prix de base (XOF)">
          <input type="number" step="0.01" className="input" {...register('prix_base', { valueAsNumber: true })} />
          {errors.prix_base && <p className="text-red-600 text-xs mt-1">{String(errors.prix_base.message)}</p>}
        </Row>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        {typeVal === 'billet_avion' && 'Astuce : gérez bagage/escales dans les “options” des lignes de réservation.'}
        {typeVal === 'evenement' && 'Astuce : les forfaits se rattachent aux produits de type “événement”.'}
      </div>

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

export default ProduitsForm
