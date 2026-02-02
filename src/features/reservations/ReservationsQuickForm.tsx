import React, { useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/axios'

// ----------------- Schéma aligné backend -----------------
const participantSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().optional(),
  date_naissance: z.string().optional(), // backend attend date_naissance (DATE)
  passeport: z.string().optional(),
  remarques: z.string().optional(),
})

const lineSchema = z.object({
  produit_id: z.coerce.number().int().positive('Produit requis'),
  designation: z.string().min(1, 'Désignation requise'),
  quantite: z.coerce.number().int().min(1, '≥ 1'),
  prix_unitaire: z.coerce.number().min(0, '≥ 0'),
  taxe: z.coerce.number().min(0).optional().default(0),
  options: z.string().optional(), // saisi en JSON (texte), converti avant POST
})

const schema = z.object({
  client_id: z.coerce.number().int().positive('Client requis'),
  devise: z.string().min(1, 'Devise requise'),
  forfait_id: z.coerce.number().int().positive().optional(),
  participants: z.array(participantSchema).optional(),
  lignes: z.array(lineSchema).min(1, 'Ajoutez au moins une ligne'),
  notes: z.string().optional(),
})

export type ReservationQuickInput = z.infer<typeof schema>

// --------------- utils ---------------
const normalizeList = (input: any): any[] => {
  if (!input) return []
  if (Array.isArray(input)) return input
  if (Array.isArray(input.data)) return input.data
  if (Array.isArray(input?.data?.data)) return input.data.data
  if (Array.isArray(input.items)) return input.items
  return []
}

const currency = (n: number, code = 'XOF') =>
  `${Number(n || 0).toLocaleString()} ${code}`

// ----------------- Composant -----------------
export const ReservationsQuickForm: React.FC<{
  defaultValues?: Partial<ReservationQuickInput>
  onSubmit: (payload: ReservationQuickInput) => void
  onCancel: () => void
  submitting?: boolean
}> = ({ defaultValues, onSubmit, onCancel, submitting }) => {
  const { register, control, handleSubmit, formState: { errors }, watch, setValue } =
    useForm<ReservationQuickInput>({
      resolver: zodResolver(schema),
      defaultValues: {
        devise: 'XOF',
        participants: [{ nom: '' }],
        lignes: [{ produit_id: 0, designation: '', quantite: 1, prix_unitaire: 0, taxe: 0, options: '' }],
        ...defaultValues,
      } as any,
    })

  // Données select
  const qClients = useQuery({
    queryKey: ['select-clients'],
    queryFn: async () => (await api.get('/clients', { params: { simple: 1 } })).data,
  })
  const qProduits = useQuery({
    queryKey: ['select-produits'],
    queryFn: async () => (await api.get('/produits', { params: { simple: 1 } })).data,
  })
  const qForfaits = useQuery({
    queryKey: ['select-forfaits'],
    queryFn: async () => (await api.get('/forfaits', { params: { simple: 1 } })).data,
  })

  const clients = normalizeList(qClients.data)
  const produits = normalizeList(qProduits.data)
  const forfaits = normalizeList(qForfaits.data)

  const { fields: partFields, append: appendPart, remove: removePart } = useFieldArray({ control, name: 'participants' })
  const { fields: lineFields, append: appendLine, remove: removeLine } = useFieldArray({ control, name: 'lignes' })

  const lignes = watch('lignes') ?? []
  const devise = watch('devise') || 'XOF'

  const pickPrix = (pid?: number) => {
    if (!pid) return 0
    const p = produits.find((x: any) => x.id === pid)
    // le backend expose prix_base; fallback sur prix si renommage
    return Number((p?.prix_base ?? p?.prix) || 0)
  }

  // cacher Participants si toutes les lignes sont billet_avion
  const hideParticipants = useMemo(() => {
    if (!lignes?.length) return false
    const types = lignes
      .map((l: any) => produits.find((p: any) => p.id === l.produit_id)?.type)
      .filter(Boolean)
    return types.length > 0 && types.every((t: string) => t === 'billet_avion')
  }, [JSON.stringify(lignes), JSON.stringify(produits)])

  const total = lignes.reduce((s: number, l: any) => {
    const qt = Number(l?.quantite || 0)
    const pu = Number(l?.prix_unitaire || 0)
    const tx = Number(l?.taxe || 0)
    return s + qt * (pu + tx)
  }, 0)

  const addLine = () => {
    const firstId = produits[0]?.id ?? 0
    appendLine({ produit_id: firstId, designation: '', quantite: 1, prix_unitaire: pickPrix(firstId), taxe: 0, options: '' } as any)
  }

  // conversion options JSON (string) -> object
  const safeParseOptions = (x?: string) => {
    if (!x) return undefined
    try { return JSON.parse(x) } catch { return undefined }
  }

  // Wrap submit pour convertir options et respecter les clés backend
  const submit = (vals: ReservationQuickInput) => {
    const payload: ReservationQuickInput = {
      ...vals,
      participants: hideParticipants ? undefined : vals.participants?.map(p => ({
        ...p,
        // on garde déjà "date_naissance"
      })),
      lignes: vals.lignes.map(l => ({
        ...l,
        taxe: l.taxe ?? 0,
        options: safeParseOptions(l.options), // backend attend un JSON
      })) as any,
    }
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {/* Entête */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <span className="label">Client</span>
          <select className="input" {...register('client_id', { valueAsNumber: true })}>
            <option value="">Sélectionner…</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nom || c.name}</option>
            ))}
          </select>
          {errors.client_id && <p className="text-red-600 text-xs mt-1">{String(errors.client_id.message)}</p>}
        </div>

        <div>
          <span className="label">Devise</span>
          <input className="input" {...register('devise')} />
          {errors.devise && <p className="text-red-600 text-xs mt-1">{String(errors.devise.message)}</p>}
        </div>

        <div>
          <span className="label">Forfait (optionnel)</span>
          <select className="input" {...register('forfait_id', { valueAsNumber: true })}>
            <option value="">—</option>
            {forfaits.map((f: any) => (
              <option key={f.id} value={f.id}>{f.nom || f.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lignes */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Lignes</div>
          <button type="button" className="btn px-3 bg-gray-200 dark:bg-white/10" onClick={addLine}>Ajouter</button>
        </div>

        <div className="space-y-3 overflow-x-auto">
          {lineFields.map((f, idx) => (
            <div key={f.id} className="grid grid-cols-12 gap-2 items-end min-w-[760px]">
              <div className="col-span-12 md:col-span-3">
                <span className="label">Produit</span>
                <select
                  className="input"
                  {...register(`lignes.${idx}.produit_id` as const, { valueAsNumber: true })}
                  onChange={(e) => {
                    const pid = Number(e.target.value)
                    setValue(`lignes.${idx}.prix_unitaire` as const, pickPrix(pid))
                  }}
                >
                  {produits.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.nom || p.name}</option>
                  ))}
                </select>
                {errors.lignes?.[idx]?.produit_id && (
                  <p className="text-red-600 text-xs mt-1">{String(errors.lignes[idx]?.produit_id?.message)}</p>
                )}
              </div>

              <div className="col-span-12 md:col-span-3">
                <span className="label">Désignation</span>
                <input className="input" {...register(`lignes.${idx}.designation` as const)} />
                {errors.lignes?.[idx]?.designation && (
                  <p className="text-red-600 text-xs mt-1">{String(errors.lignes[idx]?.designation?.message)}</p>
                )}
              </div>

              <div className="col-span-6 md:col-span-2">
                <span className="label">Quantité</span>
                <input type="number" className="input" {...register(`lignes.${idx}.quantite` as const, { valueAsNumber: true })} />
                {errors.lignes?.[idx]?.quantite && (
                  <p className="text-red-600 text-xs mt-1">{String(errors.lignes[idx]?.quantite?.message)}</p>
                )}
              </div>

              <div className="col-span-6 md:col-span-2">
                <span className="label">Prix unitaire</span>
                <input type="number" step="0.01" className="input" {...register(`lignes.${idx}.prix_unitaire` as const, { valueAsNumber: true })} />
                {errors.lignes?.[idx]?.prix_unitaire && (
                  <p className="text-red-600 text-xs mt-1">{String(errors.lignes[idx]?.prix_unitaire?.message)}</p>
                )}
              </div>

              <div className="col-span-6 md:col-span-1">
                <span className="label">Taxe</span>
                <input type="number" step="0.01" className="input" {...register(`lignes.${idx}.taxe` as const, { valueAsNumber: true })} />
              </div>

              <div className="col-span-12">
                <span className="label">Options (JSON)</span>
                <input className="input" placeholder='{"bagage":"23kg"}' {...register(`lignes.${idx}.options` as const)} />
              </div>

              <div className="col-span-12 flex justify-end">
                <button type="button" className="btn px-2 bg-red-600 text-white" onClick={() => removeLine(idx)}>Supprimer</button>
              </div>
            </div>
          ))}
          {errors.lignes && <p className="text-red-600 text-xs">{String(errors.lignes.message)}</p>}
        </div>

        <div className="mt-3 text-sm">
          Total estimé : <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-700">
            {currency(total, devise)}
          </span>
        </div>
      </div>

      {/* Participants (masqué si tous produits = billet_avion) */}
      {!hideParticipants && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Participants</div>
            <button type="button" className="btn px-3 bg-gray-200 dark:bg-white/10" onClick={() => appendPart({ nom: '' } as any)}>Ajouter</button>
          </div>

          <div className="space-y-2">
            {partFields.map((f, idx) => (
              <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 md:col-span-3">
                  <span className="label">Nom</span>
                  <input className="input" {...register(`participants.${idx}.nom` as const)} />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <span className="label">Prénom</span>
                  <input className="input" {...register(`participants.${idx}.prenom` as const)} />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <span className="label">Date de naissance</span>
                  <input type="date" className="input" {...register(`participants.${idx}.date_naissance` as const)} />
                </div>
                <div className="col-span-12 md:col-span-2">
                  <span className="label">Passeport</span>
                  <input className="input" {...register(`participants.${idx}.passeport` as const)} />
                </div>
                <div className="col-span-12 md:col-span-1 flex justify-end">
                  <button type="button" className="btn px-2 bg-red-600 text-white" onClick={() => removePart(idx)}>✕</button>
                </div>
                <div className="col-span-12">
                  <span className="label">Remarques</span>
                  <input className="input" {...register(`participants.${idx}.remarques` as const)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <span className="label">Notes</span>
        <textarea className="input" rows={3} {...register('notes')} />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={onCancel}>Annuler</button>
        <button type="submit" disabled={submitting} className="btn-primary">Enregistrer</button>
      </div>
    </form>
  )
}

export default ReservationsQuickForm
