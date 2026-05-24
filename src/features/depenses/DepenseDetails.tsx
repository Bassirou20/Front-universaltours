import React from 'react'
import {
  Plane, Building2, Car, Briefcase, BarChart2, Users, Layers,
  StickyNote, CalendarDays, Hash, CreditCard, Link2, Clock, PencilLine,
  type LucideIcon,
} from 'lucide-react'
import { cx } from '../../lib/helpers'

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
  created_at?: string | null
}

type CatEntry = {
  label: string
  icon: LucideIcon
  accent: string
  dot: string
  badge: string
  iconBg: string
}

export const CAT_CONFIG: Record<DepenseCategorie, CatEntry> = {
  billet_externe: {
    label: 'Billet (autre agence)',
    icon: Plane,
    accent: 'border-l-amber-400',
    dot: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    iconBg: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  hotel_externe: {
    label: 'Hotel (externe)',
    icon: Building2,
    accent: 'border-l-violet-400',
    dot: 'bg-violet-400',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
    iconBg: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
  },
  transport: {
    label: 'Transport',
    icon: Car,
    accent: 'border-l-blue-400',
    dot: 'bg-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    iconBg: 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
  },
  bureau: {
    label: 'Bureau',
    icon: Briefcase,
    accent: 'border-l-slate-400',
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
    iconBg: 'bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400',
  },
  marketing: {
    label: 'Marketing',
    icon: BarChart2,
    accent: 'border-l-emerald-400',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  salaires: {
    label: 'Salaires',
    icon: Users,
    accent: 'border-l-indigo-400',
    dot: 'bg-indigo-400',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  },
  autre: {
    label: 'Autre',
    icon: Layers,
    accent: 'border-l-gray-300',
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
    iconBg: 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400',
  },
}

const STATUT_CONFIG = {
  paye: {
    label: 'Payé',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    dot: 'bg-emerald-400',
  },
  en_attente: {
    label: 'En attente',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    dot: 'bg-amber-400',
  },
}

const MODE_LABELS: Record<string, string> = {
  especes: 'Espèces',
  cash: 'Cash',
  carte: 'Carte',
  virement: 'Virement',
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  cheque: 'Chèque',
  autre: 'Autre',
}

function safeDate(d?: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function InfoCell({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] p-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {label}
        </span>
      </div>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  )
}

export default function DepenseDetails({
  depense,
  onEdit,
}: {
  depense: DepenseModel
  onEdit?: () => void
}) {
  const cat = CAT_CONFIG[depense.categorie] ?? CAT_CONFIG.autre
  const statut = STATUT_CONFIG[depense.statut] ?? STATUT_CONFIG.en_attente
  const CatIcon = cat.icon

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1929] via-[#111827] to-[#0c1320] p-4">
        <div className="pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', cat.iconBg)}>
                <CatIcon size={16} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                {cat.label}
              </span>
            </div>
            <div className="text-xl font-extrabold text-white leading-tight">{depense.libelle}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-extrabold text-white">
              {Number(depense.montant || 0).toLocaleString('fr-FR')}
              <span className="text-sm font-normal text-gray-400 ml-1">XOF</span>
            </div>
            <span
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold mt-1.5',
                statut.badge,
              )}
            >
              <span className={cx('h-1.5 w-1.5 rounded-full shrink-0', statut.dot)} />
              {statut.label}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <InfoCell
          label="Date"
          value={safeDate(depense.date_depense)}
          icon={<CalendarDays size={12} />}
        />
        <InfoCell
          label="Fournisseur"
          value={depense.fournisseur_nom || '—'}
          icon={<Building2 size={12} />}
        />
        <InfoCell
          label="Référence"
          value={depense.reference || '—'}
          icon={<Hash size={12} />}
        />
        <InfoCell
          label="Mode de paiement"
          value={MODE_LABELS[depense.mode_paiement ?? ''] ?? depense.mode_paiement ?? '—'}
          icon={<CreditCard size={12} />}
        />
        <InfoCell
          label="Réservation liée"
          value={depense.reservation_id ? `#${depense.reservation_id}` : '—'}
          icon={<Link2 size={12} />}
        />
        <InfoCell
          label="Enregistré le"
          value={safeDate(depense.created_at)}
          icon={<Clock size={12} />}
        />
      </div>

      {depense.notes && (
        <div className="rounded-2xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <StickyNote size={14} className="text-gray-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Notes
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
            {depense.notes}
          </p>
        </div>
      )}

      {onEdit && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex whitespace-nowrap items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
          >
            <PencilLine size={14} />
            Modifier
          </button>
        </div>
      )}
    </div>
  )
}
