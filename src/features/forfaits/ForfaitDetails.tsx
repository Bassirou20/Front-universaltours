import React from 'react'
import { Badge } from '../../ui/Badge'
import { Users, Info, PencilLine, CalendarDays, Tag, CircleDollarSign } from 'lucide-react'

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

const TYPE_TONE: Record<ForfaitModel['type'], any> = {
  couple: 'purple',
  famille: 'blue',
  solo: 'amber',
}

const money = (n?: number | null) =>
  `${Number(n || 0).toLocaleString()} XOF`

export const ForfaitDetails: React.FC<{
  forfait?: ForfaitModel | null
  eventName?: string
  onEdit?: () => void
}> = ({ forfait, eventName, onEdit }) => {
  if (!forfait) return null

  const isActive = !!forfait.actif
  const friendlyDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString() : '—'

  const eventLabel = eventName || `#${forfait.event_id}`

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {forfait.nom}
          </h3>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge tone={TYPE_TONE[forfait.type]}>
              <span className="inline-flex items-center gap-1">
                <Tag size={14} />
                {TYPE_LABEL[forfait.type]}
              </span>
            </Badge>

            <Badge tone={isActive ? 'green' : 'red'}>
              {isActive ? 'Actif' : 'Inactif'}
            </Badge>

            <Badge tone="gray">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={14} />
                Événement : {eventLabel}
              </span>
            </Badge>

            <Badge tone="gray">
              Créé le {friendlyDate(forfait.created_at)}
            </Badge>
          </div>
        </div>

        {onEdit && (
          <button
            className="btn bg-gray-200 dark:bg-white/10 inline-flex items-center gap-2 px-4"
            onClick={onEdit}
          >
            <PencilLine size={16} />
            Modifier
          </button>
        )}
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CAPACITÉ */}
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-5">
          <div className="text-sm font-semibold mb-2 inline-flex items-center gap-2">
            <Users size={16} />
            Capacité
          </div>
          <div className="text-lg font-bold">
            {forfait.nombre_max_personnes}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Nombre maximum de participants
          </div>
        </div>

        {/* TARIFICATION */}
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-5">
          <div className="text-sm font-semibold mb-2 inline-flex items-center gap-2">
            <CircleDollarSign size={16} />
            Tarification
          </div>

          {forfait.type === 'famille' ? (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Adulte :</span>{' '}
                <span className="font-semibold">{money(forfait.prix_adulte)}</span>
              </div>
              <div>
                <span className="text-gray-500">Enfant :</span>{' '}
                <span className="font-semibold">{money(forfait.prix_enfant)}</span>
              </div>
            </div>
          ) : (
            <div className="text-lg font-bold">
              {money(forfait.prix)}
            </div>
          )}
        </div>

        {/* DESCRIPTION */}
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-5">
          <div className="text-sm font-semibold mb-2 inline-flex items-center gap-2">
            <Info size={16} />
            Description
          </div>

          <div className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
            {forfait.description || (
              <span className="text-gray-400">Aucune description</span>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER META */}
      <div className="text-xs text-gray-400 flex justify-between">
        <span>ID: #{forfait.id}</span>
        <span>
          Dernière mise à jour : {friendlyDate(forfait.updated_at)}
        </span>
      </div>
    </div>
  )
}

export default ForfaitDetails
