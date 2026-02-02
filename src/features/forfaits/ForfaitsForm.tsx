import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Row } from '../../ui/Form'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/axios'

const baseSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  description: z.string().nullish(),
  event_id: z.coerce.number().int().positive('Événement requis'),
  nombre_max_personnes: z.coerce.number().int().min(1, '≥ 1'),
  type: z.enum(['couple', 'famille', 'solo']),
  // actif: z.boolean().default(true),
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
    if (vals.prix != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ne pas renseigner "prix" pour un forfait famille',
        path: ['prix'],
      })
    }
  } else {
    if (vals.prix == null || isNaN(vals.prix)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Prix requis', path: ['prix'] })
    }
    if (vals.prix_adulte != null || vals.prix_enfant != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ne pas renseigner prix adulte/enfant pour solo/couple',
        path: ['prix_adulte'],
      })
    }
  }
})

export type ForfaitFormVals = z.infer<typeof schema>

const normalizeList = (input: any): any[] => {
  if (!input) return []
  if (Array.isArray(input)) return input
  if (Array.isArray(input.data)) return input.data
  if (Array.isArray(input?.data?.data)) return input.data.data
  if (Array.isArray(input.items)) return input.items
  return []
}

export const ForfaitsForm: React.FC<{
  defaultValues?: Partial<ForfaitFormVals>
  onSubmit: (vals: ForfaitFormVals) => void
  onCancel: () => void
  submitting?: boolean
}> = ({ defaultValues, onSubmit, onCancel, submitting }) => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<ForfaitFormVals>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'solo',
      actif: true,
      nombre_max_personnes: 1,
      ...defaultValues,
    } as any,
  })

  // events list (produits type "evenement")
  const qProds = useQuery({
    queryKey: ['produits-simple'],
    queryFn: async () => (await api.get('/produits', { params: { simple: 1 } })).data,
  })

  const eventsOnly = useMemo(() => {
    const list = normalizeList(qProds.data)
    return list.filter((p: any) => (p.type ?? p?.categorie) === 'evenement' || p?.type === 'evenement')
  }, [qProds.data])

  const typeVal = watch('type')

  return (
    <form onSubmit={handleSubmit((vals) => onSubmit(vals))} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Nom">
          <input className="input" {...register('nom')} />
          {errors.nom && <p className="text-red-600 text-xs mt-1">{String(errors.nom.message)}</p>}
        </Row>

        <Row label="Type">
          <select className="input" {...register('type')}>
            <option value="solo">Solo</option>
            <option value="couple">Couple</option>
            <option value="famille">Famille</option>
          </select>
        </Row>
      </div>

      <Row label="Description">
        <textarea className="input" rows={3} {...register('description' as const)} placeholder="Détails du forfait…" />
      </Row>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Row label="Événement (produit)">
          <select className="input" {...register('event_id', { valueAsNumber: true })}>
            <option value="">— Choisir un événement —</option>
            {eventsOnly.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.nom || p.name}
              </option>
            ))}
          </select>
          {errors.event_id && <p className="text-red-600 text-xs mt-1">{String(errors.event_id.message)}</p>}
        </Row>

        <Row label="Nombre max personnes">
          <input type="number" className="input" {...register('nombre_max_personnes', { valueAsNumber: true })} />
          {errors.nombre_max_personnes && (
            <p className="text-red-600 text-xs mt-1">{String(errors.nombre_max_personnes.message)}</p>
          )}
        </Row>

        {/* <Row label="Actif">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" {...register('actif')} />
            <span className="text-sm">Activer</span>
          </label>
        </Row> */}
      </div>

      {/* Bloc tarifs conditionnel */}
      {typeVal === 'famille' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Row label="Prix adulte (XOF)">
            <input type="number" step="0.01" className="input" {...register('prix_adulte', { valueAsNumber: true })} />
            {errors.prix_adulte && <p className="text-red-600 text-xs mt-1">{String(errors.prix_adulte.message)}</p>}
          </Row>
          <Row label="Prix enfant (XOF)">
            <input type="number" step="0.01" className="input" {...register('prix_enfant', { valueAsNumber: true })} />
            {errors.prix_enfant && <p className="text-red-600 text-xs mt-1">{String(errors.prix_enfant.message)}</p>}
          </Row>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Row label="Prix (XOF)">
            <input type="number" step="0.01" className="input" {...register('prix', { valueAsNumber: true })} />
            {errors.prix && <p className="text-red-600 text-xs mt-1">{String(errors.prix.message)}</p>}
          </Row>
          <div />
        </div>
      )}

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

export default ForfaitsForm
