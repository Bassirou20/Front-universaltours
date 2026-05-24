import React from 'react'
import {
  User, Users, Home, CircleDollarSign, CalendarDays,
  PencilLine, CheckCircle2, XCircle, type LucideIcon,
} from 'lucide-react'

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

type TypeEntry = {
  label: string
  icon: LucideIcon
  hero: string
  iconBg: string
  badge: string
}

const TYPE_CONFIG: Record<ForfaitModel['type'], TypeEntry> = {
  solo: {
    label: 'Solo',
    icon: User,
    hero: 'from-amber-900 via-amber-800 to-[#111827]',
    iconBg: 'bg-amber-500/20 text-amber-300',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  },
  couple: {
    label: 'Couple',
    icon: Users,
    hero: 'from-purple-900 via-purple-800 to-[#111827]',
    iconBg: 'bg-purple-500/20 text-purple-300',
    badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  },
  famille: {
    label: 'Famille',
    icon: Home,
    hero: 'from-blue-900 via-blue-800 to-[#111827]',
    iconBg: 'bg-blue-500/20 text-blue-300',
    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  },
}

const money = (n?: number | null) =>
  n != null ? `${Number(n).toLocaleString()} XOF` : '—'

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

export const ForfaitDetails: React.FC<{
  forfait?: ForfaitModel | null
  eventName?: string
  onEdit?: () => void
}> = ({ forfait, eventName, onEdit }) => {
  if (!forfait) return null

  const cfg = TYPE_CONFIG[forfait.type]
  const Icon = cfg.icon
  const isActive = !!forfait.actif
  const eventLabel = eventName || `#${forfait.event_id}`

  return (
    <div className="space-y-3">

      {/* ── Hero ── */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${cfg.hero} p-6`}>
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${cfg.iconBg}`}>
              <Icon size={26} />
            </div>
            <div>
              <p className="text-xs font-medium text-white/50 uppercase tracking-widest mb-1">Forfait</p>
              <h2 className="text-xl font-bold text-white leading-tight">{forfait.nom}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
                  <Icon size={11} />
                  {cfg.label}
                </span>
                <span className={[
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border-red-500/30',
                ].join(' ')}>
                  {isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                  {isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>

          {onEdit && (
            <button
              onClick={onEdit}
              className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
            >
              <PencilLine size={14} />
              Modifier
            </button>
          )}
        </div>

        {/* Décorations */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 top-10 h-24 w-24 rounded-full bg-white/5" />
      </div>

      {/* ── Info grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Capacité */}
        <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#1c2535] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            <Users size={14} />
            Capacité max
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
            {forfait.nombre_max_personnes}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {forfait.nombre_max_personnes > 1 ? 'participants' : 'participant'}
          </div>
        </div>

        {/* Tarification */}
        <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#1c2535] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            <CircleDollarSign size={14} />
            Tarification
          </div>
          {forfait.type === 'famille' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Adulte</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">{money(forfait.prix_adulte)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Enfant</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">{money(forfait.prix_enfant)}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
                {Number(forfait.prix || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">XOF</div>
            </>
          )}
        </div>

        {/* Événement + dates */}
        <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#1c2535] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            <CalendarDays size={14} />
            Événement
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-3">
            {eventLabel}
          </div>
          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex justify-between gap-2">
              <span>Créé</span>
              <span className="text-gray-700 dark:text-gray-300">{fmt(forfait.created_at)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Modifié</span>
              <span className="text-gray-700 dark:text-gray-300">{fmt(forfait.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Description ── */}
      <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#1c2535] p-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Description
        </p>
        {forfait.description ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {forfait.description}
          </p>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-600 italic">Aucune description renseignée.</p>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex justify-between text-[11px] text-gray-400 px-1">
        <span>ID #{forfait.id}</span>
        <span>Événement #{forfait.event_id}</span>
      </div>
    </div>
  )
}

export default ForfaitDetails
