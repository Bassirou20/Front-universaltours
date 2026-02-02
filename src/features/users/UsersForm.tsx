import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Row } from '../../ui/Form'

const schema = z.object({
  prenom: z.string().optional().nullable(),
  nom: z.string().min(1, 'Nom requis').max(150),
  email: z.string().email('Email invalide'),
  role: z.enum(['admin', 'employee'], { required_error: 'Rôle requis' }),
  password: z.string().optional(), // requis en create seulement (géré dans UI)
})

export type UserInput = z.infer<typeof schema>

export default function UsersForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitting,
}: {
  defaultValues?: Partial<UserInput>
  onSubmit: (vals: UserInput) => void
  onCancel: () => void
  submitting?: boolean
}) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<UserInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'employee',
      ...defaultValues,
    },
  })

  const passwordVal = watch('password')

  return (
    <form onSubmit={handleSubmit((vals) => onSubmit(vals))} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Prénom">
          <input className="input" {...register('prenom')} />
        </Row>

        <Row label="Nom">
          <input className="input" {...register('nom')} />
          {errors.nom && <p className="text-red-600 text-xs mt-1">{String(errors.nom.message)}</p>}
        </Row>
      </div>

      <Row label="Email">
        <input className="input" type="email" {...register('email')} />
        {errors.email && <p className="text-red-600 text-xs mt-1">{String(errors.email.message)}</p>}
      </Row>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Rôle">
          <select className="input" {...register('role')}>
            <option value="employee">Agent</option>
            <option value="admin">Admin</option>
          </select>
          {errors.role && <p className="text-red-600 text-xs mt-1">{String(errors.role.message)}</p>}
        </Row>

        <Row label="Mot de passe (uniquement si changement)">
          <input className="input" type="password" placeholder="••••••••" {...register('password')} />
          {passwordVal ? (
            <p className="text-xs text-gray-500 mt-1">Le mot de passe sera mis à jour.</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Laisse vide pour ne pas changer.</p>
          )}
        </Row>
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
