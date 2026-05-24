import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, User, Mail, Phone, MapPin, Globe, FileText } from 'lucide-react'
import { Row } from '../../ui/Form'

const COUNTRIES = [
  'Sénégal', 'France', 'Mali', "Côte d'Ivoire", 'Guinée', 'Mauritanie',
  'Maroc', 'Algérie', 'Tunisie', 'Cameroun', 'Gabon', 'Congo', 'Niger',
  'Burkina Faso', 'Togo', 'Bénin', 'Ghana', 'Nigeria', 'Espagne', 'Italie',
  'Portugal', 'Belgique', 'Suisse', 'États-Unis', 'Canada', 'Autre',
]

const schema = z.object({
  id: z.number().optional(),
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().optional(),
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

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex-1 h-px bg-black/5 dark:bg-white/10" />
    </div>
  )
}

function InputIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
      {icon}
    </span>
  )
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

      {/* Identité */}
      <SectionHeader icon={<User size={14} />} label="Identité" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Nom *">
          <div className="relative">
            <InputIcon icon={<User size={15} />} />
            <input className="input !pl-9" placeholder="Diallo" {...register('nom')} />
          </div>
          {errors.nom && <p className="text-red-600 text-xs mt-1">{errors.nom.message}</p>}
        </Row>
        <Row label="Prénom">
          <div className="relative">
            <InputIcon icon={<User size={15} />} />
            <input className="input !pl-9" placeholder="Mamadou" {...register('prenom')} />
          </div>
        </Row>
      </div>

      {/* Contact */}
      <SectionHeader icon={<Phone size={14} />} label="Contact" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Email">
          <div className="relative">
            <InputIcon icon={<Mail size={15} />} />
            <input className="input !pl-9" type="email" placeholder="exemple@mail.com" {...register('email')} />
          </div>
          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message as any}</p>}
        </Row>
        <Row label="Téléphone">
          <div className="relative">
            <InputIcon icon={<Phone size={15} />} />
            <input className="input !pl-9" placeholder="+221 77 000 00 00" {...register('telephone')} />
          </div>
        </Row>
      </div>

      {/* Localisation */}
      <SectionHeader icon={<Globe size={14} />} label="Localisation" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Pays">
          <div className="relative">
            <InputIcon icon={<Globe size={15} />} />
            <select className="input !pl-9" {...register('pays')}>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </Row>
        <Row label="Adresse">
          <div className="relative">
            <InputIcon icon={<MapPin size={15} />} />
            <input className="input !pl-9" placeholder="Quartier, ville…" {...register('adresse')} />
          </div>
        </Row>
      </div>

      {/* Notes */}
      <SectionHeader icon={<FileText size={14} />} label="Notes" />
      <Row label="">
        <textarea
          className="input"
          rows={3}
          placeholder="Informations complémentaires…"
          {...register('notes')}
        />
      </Row>

      <div className="flex justify-end gap-2 pt-2">
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

export default ClientsForm
