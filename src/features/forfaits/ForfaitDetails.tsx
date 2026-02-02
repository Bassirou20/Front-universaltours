import React from 'react'
import { Badge } from '../../ui/Badge'
import { Users, Info, PencilLine, CalendarDays } from 'lucide-react'

export type ForfaitModel = {
  id: number
  nom: string
  description?: string | null
  prix?: number | null
  event_id: number
  nombre_max_personnes: number
  prix_adulte?: number | null
  prix_enfant?: number | null
  type: 'couple' | 'famille' | 'solo'
  actif: boolean | number
  created_at?: string
  updated_at?: string
}

const TYPE_LABEL: Record<ForfaitModel['type'], string> = {
  couple: 'Couple',
  famille: 'Famille',
  solo: 'Solo',
}

const moneyXof = (n: any) => Number(n || 0).toLocaleString()

export const ForfaitDetails: React.FC<{
  forfait: ForfaitModel
  eventName?: string
  onEdit?: () => void
  canDelete?: boolean
}> = ({ forfait, eventName, onEdit }) => {
  const friendlyDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '—')
  const eventLabel = eventName || `#${forfait.event_id}`
  const isActive = !!forfait.actif

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="text-base md:text-lg font-semibold">{forfait.nom}</div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge tone="blue">{TYPE_LABEL[forfait.type]}</Badge>
            <Badge tone={isActive ? 'green' : 'red'}>{isActive ? 'Actif' : 'Inactif'}</Badge>
            <Badge tone="gray" >
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={14} /> Événement : {eventLabel}
              </span>
            </Badge>
            <Badge tone="gray">Créé le {friendlyDate(forfait.created_at)}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn px-3 bg-gray-200 dark:bg-white/10 inline-flex items-center gap-2" onClick={onEdit}>
            <PencilLine size={16} /> Modifier
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4 space-y-2">
          <div className="text-sm font-semibold mb-1 inline-flex items-center gap-2">
            <Users size={16} /> Capacité
          </div>
          <div className="text-sm">Nombre max personnes : {forfait.nombre_max_personnes}</div>
        </div>

        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4 space-y-2">
          <div className="text-sm font-semibold mb-1">Tarification</div>
          {forfait.type === 'famille' ? (
            <div className="text-sm">
              Adulte : {moneyXof(forfait.prix_adulte)} XOF — Enfant : {moneyXof(forfait.prix_enfant)} XOF
            </div>
          ) : (
            <div className="text-sm">Prix : {moneyXof(forfait.prix)} XOF</div>
          )}
        </div>

        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4">
          <div className="text-sm font-semibold mb-1 inline-flex items-center gap-2">
            <Info size={16} /> Description
          </div>
          <div className="text-sm whitespace-pre-wrap">
            {forfait.description || <span className="text-gray-500">—</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForfaitDetails
