import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Row } from '../../ui/Form'

const schema = z.object({
  id: z.number().optional(), // ← pour l'édition
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().optional(),
  // email optionnel, string vide -> undefined (évite 422)
  email: z
    .string()
    .email('Email invalide')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  pays: z.string().optional(),
  notes: z.string().optional(),
})

export type ClientInput = z.infer<typeof schema>

type Props = {
  defaultValues?: Partial<ClientInput>
  onSubmit: (vals: ClientInput) => void
  onCancel: () => void
  submitting?: boolean
}

export const ClientsForm: React.FC<Props> = ({
  defaultValues,
  onSubmit,
  onCancel,
  submitting,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientInput>({
    resolver: zodResolver(schema),
    defaultValues: (defaultValues as any) ?? {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      adresse: '',
      pays: 'Sénégal',
      notes: '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" id="clientForm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Nom">
          <input className="input" {...register('nom')} />
          {errors.nom && <p className="text-red-600 text-xs mt-1">{errors.nom.message}</p>}
        </Row>
        <Row label="Prénom">
          <input className="input" {...register('prenom')} />
        </Row>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Email">
          <input className="input" type="email" {...register('email')} />
          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message as any}</p>}
        </Row>
        <Row label="Téléphone">
          <input className="input" {...register('telephone')} />
        </Row>
      </div>

      <Row label="Adresse">
        <input className="input" {...register('adresse')} />
      </Row>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Pays">
          <input className="input" {...register('pays')} />
        </Row>
        <div />
      </div>

      <Row label="Notes">
        <textarea className="input" rows={3} {...register('notes')} />
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

export default ClientsForm
