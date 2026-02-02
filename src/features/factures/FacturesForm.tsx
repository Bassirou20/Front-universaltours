
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Row } from '../../ui/Form'
const schema = z.object({ numero: z.string().min(1), statut: z.enum(['payee','impayee','partielle']).default('impayee'), total: z.number().nonnegative(), due_date: z.string().optional(), reservation_id: z.number().int().optional() })
export type FactureInput = z.infer<typeof schema>
export const FacturesForm: React.FC<{defaultValues?: Partial<FactureInput>; onSubmit: (vals: FactureInput)=>void; onCancel: ()=>void; submitting?: boolean}> = ({ defaultValues, onSubmit, onCancel, submitting }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FactureInput>({ resolver: zodResolver(schema), defaultValues })
  return (<form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
    <Row label="Numéro"><input className="input" {...register('numero')} />{errors.numero && <p className="text-red-600 text-xs mt-1">{errors.numero.message}</p>}</Row>
    <Row label="Statut"><select className="input" {...register('statut')}><option value="impayee">Impayée</option><option value="partielle">Partielle</option><option value="payee">Payée</option></select></Row>
    <Row label="Total (FCFA)"><input className="input" type="number" step="0.01" {...register('total', { valueAsNumber: true })} />{errors.total && <p className="text-red-600 text-xs mt-1">{errors.total.message as any}</p>}</Row>
    <Row label="Échéance"><input className="input" type="date" {...register('due_date')} /></Row>
    <Row label="Réservation ID"><input className="input" type="number" {...register('reservation_id', { valueAsNumber: true })} /></Row>
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={onCancel}>Annuler</button>
      <button type="submit" disabled={submitting} className="btn-primary">Enregistrer</button>
    </div>
  </form>)
}
