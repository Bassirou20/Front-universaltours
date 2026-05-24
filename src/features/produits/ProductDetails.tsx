import React from 'react'
import { Plane, Building2, Car, CalendarDays, CircleDollarSign, PencilLine, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react'

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

type TypeEntry = {
  label: string
  icon: LucideIcon
  hero: string
  iconBg: string
  badge: string
}

const TYPE_CONFIG: Record<ProductDetailsModel['type'], TypeEntry> = {
  billet_avion: {
    label: "Billet d'avion",
    icon: Plane,
    hero: 'from-sky-900 via-sky-800 to-[#111827]',
    iconBg: 'bg-sky-500/20 text-sky-300',
    badge: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  },
  hotel: {
    label: 'Hôtel',
    icon: Building2,
    hero: 'from-violet-900 via-violet-800 to-[#111827]',
    iconBg: 'bg-violet-500/20 text-violet-300',
    badge: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
  },
  voiture: {
    label: 'Voiture',
    icon: Car,
    hero: 'from-blue-900 via-blue-800 to-[#111827]',
    iconBg: 'bg-blue-500/20 text-blue-300',
    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  },
  evenement: {
    label: 'Événement',
    icon: CalendarDays,
    hero: 'from-emerald-900 via-emerald-800 to-[#111827]',
    iconBg: 'bg-emerald-500/20 text-emerald-300',
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  },
}

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

export const ProductDetails: React.FC<{
  produit: ProductDetailsModel
  onEdit?: () => void
}> = ({ produit, onEdit }) => {
  const cfg = TYPE_CONFIG[produit.type]
  const Icon = cfg.icon
  const isActive = !!produit.actif

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
              <p className="text-xs font-medium text-white/50 uppercase tracking-widest mb-1">Service</p>
              <h2 className="text-xl font-bold text-white leading-tight">{produit.nom}</h2>
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

      {/* ── Infos ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Prix */}
        <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#1c2535] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            <CircleDollarSign size={14} />
            Prix de base
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
            {Number(produit.prix_base || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">XOF</div>
        </div>

        {/* Statut */}
        <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#1c2535] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            {isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            Statut
          </div>
          <div className={`text-lg font-bold ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {isActive ? 'Actif' : 'Inactif'}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {isActive ? 'Disponible à la vente' : 'Masqué des réservations'}
          </div>
        </div>

        {/* Dates */}
        <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#1c2535] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            <CalendarDays size={14} />
            Dates
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Créé le</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(produit.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Modifié le</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(produit.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Description ── */}
      <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#1c2535] p-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Description
        </p>
        {produit.description ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {produit.description}
          </p>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-600 italic">Aucune description renseignée.</p>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex justify-between text-[11px] text-gray-400 px-1">
        <span>ID #{produit.id}</span>
        {produit.type === 'evenement' && (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            Les forfaits se rattachent à ce service
          </span>
        )}
      </div>
    </div>
  )
}

export default ProductDetails
