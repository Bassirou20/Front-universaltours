import React from 'react'
import { Badge } from '../../ui/Badge'

export type DepenseCategorie =
  | 'billet_externe'
  | 'hotel_externe'
  | 'transport'
  | 'bureau'
  | 'marketing'
  | 'salaires'
  | 'autre'

export type DepenseModel = {
  id: number
  date_depense: string
  categorie: DepenseCategorie
  libelle: string
  fournisseur_nom?: string | null
  reference?: string | null
  montant: number
  mode_paiement?: string | null
  statut: 'paye' | 'en_attente'
  reservation_id?: number | null
  notes?: string | null
}

const catLabel: Record<DepenseCategorie, string> = {
  billet_externe: 'Billet (autre agence)',
  hotel_externe: 'Hôtel (externe)',
  transport: 'Transport',
  bureau: 'Bureau',
  marketing: 'Marketing',
  salaires: 'Salaires',
  autre: 'Autre',
}

const catTone = (c?: DepenseCategorie | null) => {
  const x = (c || '').toLowerCase()
  if (x.includes('billet')) return 'amber'
  if (x.includes('hotel')) return 'purple'
  if (x.includes('transport')) return 'blue'
  if (x.includes('marketing')) return 'green'
  return 'gray'
}

export default function DepenseDetails({ depense }: { depense: DepenseModel }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          Dépense #{depense.id}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={catTone(depense.categorie)}>{catLabel[depense.categorie]}</Badge>
          <Badge tone={depense.statut === 'paye' ? 'green' : 'amber'}>
            {depense.statut === 'paye' ? 'Payé' : 'En attente'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="card p-3">
          <div className="text-xs text-gray-500">Date</div>
          <div className="font-medium">{depense.date_depense}</div>
        </div>

        <div className="card p-3">
          <div className="text-xs text-gray-500">Montant</div>
          <div className="font-semibold">{Number(depense.montant || 0).toLocaleString('fr-FR')} FCFA</div>
        </div>

        <div className="card p-3">
          <div className="text-xs text-gray-500">Fournisseur</div>
          <div className="font-medium">{depense.fournisseur_nom ?? '—'}</div>
        </div>

        <div className="card p-3">
          <div className="text-xs text-gray-500">Référence</div>
          <div className="font-medium">{depense.reference ?? '—'}</div>
        </div>

        <div className="card p-3">
          <div className="text-xs text-gray-500">Mode paiement</div>
          <div className="font-medium">{depense.mode_paiement ?? '—'}</div>
        </div>

        <div className="card p-3">
          <div className="text-xs text-gray-500">Réservation liée</div>
          <div className="font-medium">{depense.reservation_id ? `#${depense.reservation_id}` : '—'}</div>
        </div>
      </div>

      {depense.notes && (
        <div className="card p-3">
          <div className="text-xs text-gray-500">Notes</div>
          <div className="whitespace-pre-line">{depense.notes}</div>
        </div>
      )}
    </div>
  )
}
