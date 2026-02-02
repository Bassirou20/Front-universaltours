import React from 'react'
import { Badge } from '../../ui/Badge'
import { Calendar, Receipt, Hash, Wallet, Info } from 'lucide-react'

export type PaiementModel = {
  id: number
  facture_id: number
  montant: number
  mode_paiement?: string | null
  reference?: string | null
  note?: string | null
  date_paiement?: string | null
  created_at?: string | null
  facture?: { id: number; numero?: string | null; total?: number | null; statut?: string | null } | null
}

const MODE_TONE = (m?: string | null) => {
  const x = (m || '').toLowerCase()
  if (x.includes('orange')) return 'amber'
  if (x.includes('wave')) return 'blue'
  if (x.includes('virement')) return 'purple'
  if (x.includes('carte')) return 'green'
  if (x.includes('free')) return 'purple'
  return 'gray'
}

const money = (n: any, devise = 'XOF') => `${Number(n || 0).toLocaleString()} ${devise}`

export const PaiementDetails: React.FC<{ paiement: PaiementModel }> = ({ paiement }) => {
  const dateLabel = (paiement.date_paiement || paiement.created_at || '').slice(0, 10) || '—'
  const factureLabel = paiement.facture?.numero ?? `Facture #${paiement.facture_id}`

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold flex items-center gap-2">
          <Wallet size={18} /> Paiement #{paiement.id}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge tone="gray">
            <span className="inline-flex items-center gap-1">
              <Receipt size={14} /> {factureLabel}
            </span>
          </Badge>

          <Badge tone={MODE_TONE(paiement.mode_paiement) as any}>{paiement.mode_paiement || '—'}</Badge>

          <Badge tone="gray">
            <span className="inline-flex items-center gap-1">
              <Calendar size={14} /> {dateLabel}
            </span>
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4">
          <div className="text-xs text-gray-500 mb-1">Montant</div>
          <div className="text-xl font-bold">{money(paiement.montant)}</div>
        </div>

        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4">
          <div className="text-xs text-gray-500 mb-1">Référence</div>
          <div className="text-sm font-semibold break-words">
            {paiement.reference || <span className="text-gray-400">—</span>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4">
        <div className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Info size={16} /> Facture
        </div>
        <div className="text-sm space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-600 dark:text-gray-400">Numéro</span>
            <span className="font-medium">{paiement.facture?.numero ?? `#${paiement.facture_id}`}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-600 dark:text-gray-400">Statut</span>
            <span className="font-medium">{paiement.facture?.statut ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-600 dark:text-gray-400">Total facture</span>
            <span className="font-medium">{money(paiement.facture?.total ?? 0)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4">
        <div className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Hash size={16} /> Note
        </div>
        <div className="text-sm whitespace-pre-wrap">{paiement.note || <span className="text-gray-400">—</span>}</div>
      </div>
    </div>
  )
}

export default PaiementDetails
