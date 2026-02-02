import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Row } from '../../ui/Form'

const Categories = [
  'billet_externe',
  'hotel_externe',
  'transport',
  'bureau',
  'marketing',
  'salaires',
  'autre',
] as const

const Status = ['paye', 'en_attente'] as const

const schema = z
  .object({
    date_depense: z.string().min(1, 'Date requise'),
    categorie: z.enum(Categories, { errorMap: () => ({ message: 'Catégorie requise' }) }),
    libelle: z.string().min(1, 'Libellé requis').max(190),
    fournisseur_nom: z.string().optional().nullable(),
    reference: z.string().optional().nullable(),
    montant: z.coerce.number().min(0, 'Montant invalide'),
    mode_paiement: z.string().optional().nullable(),
    statut: z.enum(Status).default('paye'),
    reservation_id: z.coerce.number().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .superRefine((v, ctx) => {
    const cat = v.categorie

    // Catégories "externes" -> fournisseur requis (c'est logique/pro)
    if (cat === 'billet_externe' || cat === 'hotel_externe') {
      if (!v.fournisseur_nom || !v.fournisseur_nom.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fournisseur_nom'],
          message: 'Le fournisseur est requis pour une dépense externe.',
        })
      }
    }

    // Billet externe -> référence fortement recommandée (je la mets obligatoire pour éviter erreurs)
    if (cat === 'billet_externe') {
      if (!v.reference || !v.reference.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reference'],
          message: 'La référence du billet est requise (numéro billet / facture).',
        })
      }
    }

    // Salaires -> notes conseillées (ex: employé + mois)
    if (cat === 'salaires') {
      if (!v.notes || !v.notes.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['notes'],
          message: 'Notes requises (ex: Employé + mois).',
        })
      }
    }
  })

export type DepenseInput = z.infer<typeof schema>

type ReservationMini = { id: number; reference?: string | null; nom?: string | null }

const catLabel: Record<DepenseInput['categorie'], string> = {
  billet_externe: 'Billet (autre agence)',
  hotel_externe: 'Hôtel (externe)',
  transport: 'Transport',
  bureau: 'Bureau',
  marketing: 'Marketing',
  salaires: 'Salaires',
  autre: 'Autre',
}

export default function DepensesForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitting,
  reservations,
}: {
  defaultValues?: Partial<DepenseInput>
  onSubmit: (vals: DepenseInput) => void
  onCancel: () => void
  submitting?: boolean
  reservations?: ReservationMini[]
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<DepenseInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      statut: 'paye',
      date_depense: new Date().toISOString().slice(0, 10),
      ...defaultValues,
    },
  })

  const categorie = watch('categorie')

  const ui = useMemo(() => {
    const showFournisseur = categorie === 'billet_externe' || categorie === 'hotel_externe'
    const showReference = categorie === 'billet_externe' || categorie === 'hotel_externe'
    const showReservation = categorie === 'billet_externe' // uniquement billet externe (cas métier principal)
    const showModePaiement = true
    const showNotes = true

    const libellePh =
      categorie === 'billet_externe'
        ? 'Ex: Achat billet Dakar–Paris (chez Agence X)'
        : categorie === 'hotel_externe'
          ? 'Ex: Réservation hôtel (via fournisseur)'
          : categorie === 'transport'
            ? 'Ex: Taxi / Carburant / Livraison'
            : categorie === 'bureau'
              ? 'Ex: Internet / Loyer / Fournitures'
              : categorie === 'marketing'
                ? 'Ex: Sponsor Facebook / Affiche / Publicité'
                : categorie === 'salaires'
                  ? 'Ex: Salaire - Janvier 2026'
                  : 'Ex: Dépense diverse'

    const fournisseurPh =
      categorie === 'billet_externe'
        ? 'Ex: Agence partenaire (où le billet est émis)'
        : categorie === 'hotel_externe'
          ? 'Ex: Hôtel / Agence partenaire'
          : 'Ex: Fournisseur'

    const referencePh =
      categorie === 'billet_externe'
        ? 'Ex: N° billet / facture fournisseur'
        : 'Ex: N° facture / référence'

    const notesPh =
      categorie === 'salaires'
        ? 'Ex: Employé: John Doe • Mois: Janvier 2026 • Observations...'
        : categorie === 'marketing'
          ? 'Ex: Campagne: Facebook • Période: ... • Objectif...'
          : 'Notes (optionnel)'

    return {
      showFournisseur,
      showReference,
      showReservation,
      showModePaiement,
      showNotes,
      libellePh,
      fournisseurPh,
      referencePh,
      notesPh,
    }
  }, [categorie])

  // Petite amélioration UX: si on change de catégorie vers une catégorie non externe,
  // on peut nettoyer fournisseur/référence (sans forcer — tu peux retirer si tu préfères conserver).
  const handleCategorieChange = (value: DepenseInput['categorie'] | '') => {
    setValue('categorie', value as DepenseInput['categorie'])

    if (value !== 'billet_externe' && value !== 'hotel_externe') {
      setValue('fournisseur_nom', '')
      setValue('reference', '')
    }
    if (value !== 'billet_externe') {
      setValue('reservation_id', null)
    }
  }

  return (
    <form onSubmit={handleSubmit((vals) => onSubmit(vals))} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Date dépense">
          <input className="input" type="date" {...register('date_depense')} />
          {errors.date_depense && <p className="text-red-600 text-xs mt-1">{String(errors.date_depense.message)}</p>}
        </Row>

        <Row label="Statut">
          <select className="input" {...register('statut')}>
            <option value="paye">Payé</option>
            <option value="en_attente">En attente</option>
          </select>
        </Row>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Catégorie">
          <select
            className="input"
            value={categorie ?? ''}
            onChange={(e) => handleCategorieChange(e.target.value as any)}
          >
            <option value="">— Choisir —</option>
            {Categories.map((c) => (
              <option key={c} value={c}>
                {catLabel[c]}
              </option>
            ))}
          </select>
          {errors.categorie && <p className="text-red-600 text-xs mt-1">{String(errors.categorie.message)}</p>}
        </Row>

        <Row label="Montant">
          <input className="input" type="number" step="0.01" {...register('montant')} />
          {errors.montant && <p className="text-red-600 text-xs mt-1">{String(errors.montant.message)}</p>}
        </Row>
      </div>

      <Row label="Libellé">
        <input className="input" placeholder={ui.libellePh} {...register('libelle')} />
        {errors.libelle && <p className="text-red-600 text-xs mt-1">{String(errors.libelle.message)}</p>}
      </Row>

      {(ui.showFournisseur || ui.showReference) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ui.showFournisseur && (
            <Row label="Fournisseur">
              <input className="input" placeholder={ui.fournisseurPh} {...register('fournisseur_nom')} />
              {errors.fournisseur_nom && <p className="text-red-600 text-xs mt-1">{String(errors.fournisseur_nom.message)}</p>}
            </Row>
          )}

          {ui.showReference && (
            <Row label="Référence">
              <input className="input" placeholder={ui.referencePh} {...register('reference')} />
              {errors.reference && <p className="text-red-600 text-xs mt-1">{String(errors.reference.message)}</p>}
            </Row>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ui.showModePaiement && (
          <Row label="Mode de paiement">
            <select className="input" {...register('mode_paiement')}>
              <option value="">—</option>
              <option value="cash">Cash</option>
              <option value="wave">Wave</option>
              <option value="orange_money">Orange Money</option>
              <option value="virement">Virement</option>
              <option value="cheque">Chèque</option>
              <option value="carte">Carte</option>
              <option value="autre">Autre</option>
            </select>
          </Row>
        )}

        {ui.showReservation ? (
          <Row label="Réservation liée (optionnel)">
            <select className="input" {...register('reservation_id')}>
              <option value="">—</option>
              {(reservations ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} {r.reference ? `• ${r.reference}` : ''} {r.nom ? `• ${r.nom}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Conseillé pour calculer la marge (vente - dépenses externes).
            </p>
          </Row>
        ) : (
          <div />
        )}
      </div>

      {ui.showNotes && (
        <Row label={categorie === 'salaires' ? 'Notes (obligatoire)' : 'Notes (optionnel)'}>
          <textarea className="input min-h-[90px]" placeholder={ui.notesPh} {...register('notes')} />
          {errors.notes && <p className="text-red-600 text-xs mt-1">{String(errors.notes.message)}</p>}
        </Row>
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
