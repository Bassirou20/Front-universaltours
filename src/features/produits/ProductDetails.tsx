import React from 'react'
import { Package2, Coins, Info, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '../../ui/Badge'

export type ProductDetailsModel = {
  id: number
  type: 'billet_avion' | 'hotel' | 'voiture' | 'evenement'
  nom: string
  description?: string | null
  prix_base: number
  actif: boolean | number
  created_at?: string
  updated_at?: string
}

const TYPE_LABELS: Record<ProductDetailsModel['type'], string> = {
  billet_avion: 'Billet d’avion',
  hotel: 'Hôtel',
  voiture: 'Voiture',
  evenement: 'Événement',
}

const RowKPI: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4">
    <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">{icon}{label}</div>
    <div className="text-base font-semibold">{value}</div>
  </div>
)

export const ProductDetails: React.FC<{
  produit: ProductDetailsModel
  onEdit?: () => void
}> = ({ produit }) => {
  const friendlyDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '—')
  const isActive = !!produit.actif

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="text-base md:text-lg font-semibold flex items-center gap-2">
            <Package2 size={18} /> {produit.nom}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge tone="blue">{TYPE_LABELS[produit.type]}</Badge>
           <Badge tone={isActive ? 'green' : 'red'}>
              <span className="inline-flex items-center gap-1">
                {isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {isActive ? 'Actif' : 'Inactif'}
              </span>
            </Badge>

            <Badge tone="gray">Créé le {friendlyDate(produit.created_at)}</Badge>
            <Badge tone="gray">MAJ {friendlyDate(produit.updated_at)}</Badge>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <RowKPI
          label="Prix de base"
          value={`${Number(produit.prix_base || 0).toLocaleString()} XOF`}
          icon={<Coins size={14} />}
        />
        <RowKPI label="Type" value={TYPE_LABELS[produit.type]} />
      </div>

      {/* Description */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4">
        <div className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Info size={16} /> Description
        </div>
        <div className="text-sm whitespace-pre-wrap">
          {produit.description || <span className="text-gray-500">Aucune description.</span>}
        </div>
      </div>
    </div>
  )
}

export default ProductDetails
