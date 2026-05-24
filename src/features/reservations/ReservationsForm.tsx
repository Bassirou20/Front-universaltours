// src/features/reservations/ReservationsForm.tsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import {
  User,
  Users,
  Calendar,
  MapPin,
  Plane,
  Ticket,
  Hotel,
  Car,
  PartyPopper,
  Package,
  Receipt,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Search,
  Shield,
  Stamp,
  Globe,
  Loader2,
  Save,
  Plus,
  Trash2,
  ArrowRight,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  AlertCircle,
  UserPlus,
  UserCheck,
  Mail,
  Phone,
} from 'lucide-react'

export type ReservationType =
  | 'billet_avion'
  | 'hotel'
  | 'voiture'
  | 'evenement'
  | 'forfait'
  | 'assurance'
  | 'evisa'

type BeneficiaryInput = {
  nom: string
  prenom?: string
  saved?: boolean
}

export type ReservationInput = {
  id?: number
  client_id?: number | null
  client_mode?: 'existing' | 'new'
  client?: {
    nom?: string
    prenom?: string
    email?: string
    telephone?: string
    adresse?: string
    pays?: string
  }
  type: ReservationType
  statut?: string
  reference?: string | null
  nombre_personnes?: number
  montant_sous_total?: number | null
  montant_taxes?: number | null
  montant_total?: number
  notes?: string | null
  passenger_is_client?: boolean
  beneficiaries?: BeneficiaryInput[]
  passengers?: Array<{ nom: string; prenom?: string | null }>
  passenger?: { nom: string; prenom?: string }
  flight_details?: {
    ville_depart: string
    ville_arrivee: string
    date_depart?: string | null
    date_arrivee?: string | null
    compagnie?: string | null
    pnr?: string | null
    classe?: string | null
  }
  ville_depart?: string | null
  ville_arrivee?: string | null
  date_depart?: string | null
  date_arrivee?: string | null
  compagnie?: string | null
  pnr?: string | null
  classe?: string | null
  assurance_details?: {
    libelle: string
    date_debut?: string | null
    date_fin?: string | null
  }
  evisa_details?: {
    pays_destination: string
    type_visa?: string | null
    date_voyage?: string | null
    duree_sejour?: string | null
  }
  produit_id?: number | null
  forfait_id?: number | null
  participants?: Array<{
    nom: string
    prenom?: string
    passport?: string
    age?: number | null
    remarques?: string
    role?: string
  }>
  acompte?: {
    montant?: number
    mode_paiement?: string
    reference?: string
  }
}

type Props = {
  defaultValues?: Partial<ReservationInput>
  submitting?: boolean
  onCancel: () => void
  onSubmit: (vals: ReservationInput) => void
}

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ')
}

function money(n: any, devise = 'XOF') {
  return `${Number(n || 0).toLocaleString()} ${devise}`
}

// ─── Type metadata with richer colors ───────────────────────────────────────
const TYPE_META: Record<
  ReservationType,
  { label: string; icon: React.ReactNode; hint: string; color: string; bg: string }
> = {
  billet_avion: {
    label: "Billet d'avion",
    icon: <Plane size={18} />,
    hint: 'Vol + bénéficiaires.',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30',
  },
  hotel: {
    label: 'Hôtel',
    icon: <Hotel size={18} />,
    hint: 'Produit hôtel + montant.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
  },
  voiture: {
    label: 'Location voiture',
    icon: <Car size={18} />,
    hint: '1 réservation = 1 personne.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
  },
  evenement: {
    label: 'Évènement',
    icon: <PartyPopper size={18} />,
    hint: 'Participants optionnels.',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',
  },
  forfait: {
    label: 'Forfait',
    icon: <Package size={18} />,
    hint: 'Forfait + participants.',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30',
  },
  assurance: {
    label: 'Assurance',
    icon: <Shield size={18} />,
    hint: 'Libellé + période + bénéficiaire.',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
  },
  evisa: {
    label: 'E-Visa',
    icon: <Stamp size={18} />,
    hint: 'Pays de destination + demandeurs.',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30',
  },
}

// ─── Avatar client (couleur déterministe selon le nom) ──────────────────────
const AVATAR_COLORS = [
  'bg-sky-500',     'bg-emerald-500', 'bg-amber-500',  'bg-rose-500',
  'bg-violet-500',  'bg-indigo-500',  'bg-pink-500',   'bg-cyan-500',
  'bg-teal-500',    'bg-orange-500',
]
function clientAvatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function clientInitials(c: any): string {
  const a = String(c?.prenom || '').trim()[0] || ''
  const b = String(c?.nom || '').trim()[0] || ''
  return ((a + b) || String(c?.email || '?')[0] || '?').toUpperCase().slice(0, 2)
}
function ClientAvatar({ client, active = false, size = 8 }: { client: any; active?: boolean; size?: number }) {
  const seed = String(client?.id || '') + String(client?.nom || '') + String(client?.prenom || '')
  const color = clientAvatarColor(seed)
  const sizeCls = size === 10 ? 'w-10 h-10 text-sm' : size === 9 ? 'w-9 h-9 text-xs' : 'w-8 h-8 text-[11px]'
  return (
    <div className={cx(
      'rounded-full flex items-center justify-center shrink-0 text-white font-bold',
      sizeCls,
      active ? color + ' ring-2 ring-white dark:ring-gray-900 shadow' : color
    )}>
      {clientInitials(client)}
    </div>
  )
}

// ─── Stepper redesigned ──────────────────────────────────────────────────────
function Stepper({
  steps,
  current,
  onGo,
  title,
}: {
  steps: Array<{ title: string; subtitle?: string }>
  current: number
  onGo?: (idx: number) => void
  title: string
}) {
  const pct = steps.length <= 1 ? 100 : Math.round((current / (steps.length - 1)) * 100)
  const currentStep = steps[current]
  return (
    <div className="mb-4 space-y-3">
      {/* Header : Étape badge + titre + sous-titre */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-500/15 px-2 py-0.5 rounded-full whitespace-nowrap">
            Étape {current + 1} / {steps.length}
          </span>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {currentStep?.title || title}
          </h2>
        </div>
        {currentStep?.subtitle && (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {currentStep.subtitle}
          </span>
        )}
      </div>

      {/* Barre de progression */}
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gray-900 dark:bg-white transition-[width] duration-400 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Pilules d'étapes */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
        {steps.map((s, i) => {
          const active = i === current
          const done = i < current
          return (
            <button
              key={i}
              type="button"
              onClick={() => onGo?.(i)}
              disabled={!done && !active}
              className={cx(
                'rounded-xl border px-2.5 py-1.5 text-left transition flex items-center gap-2 min-w-0',
                active
                  ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                  : done
                  ? 'border-black/10 dark:border-white/15 bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] cursor-pointer'
                  : 'border-black/[0.06] dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02] text-gray-400 dark:text-gray-500 cursor-default'
              )}
            >
              <span
                className={cx(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                  active
                    ? 'bg-white/20 dark:bg-gray-900/15 text-white dark:text-gray-900'
                    : done
                    ? 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                    : 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-gray-500'
                )}
              >
                {done ? <CheckCircle2 size={11} /> : i + 1}
              </span>
              <span className="text-[11px] font-medium truncate">{s.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Section card ────────────────────────────────────────────────────────────
function Section({
  title,
  icon,
  badge,
  children,
  className,
}: {
  title: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cx('rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-panel overflow-hidden shadow-sm', className)}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-gray-500 dark:text-gray-400 shrink-0">{icon}</span>}
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{title}</span>
        </div>
        {badge}
      </div>
      <div className="p-4 min-w-0">{children}</div>
    </div>
  )
}

// ─── Field wrapper ───────────────────────────────────────────────────────────
function Field({
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cx('min-w-0', className)}>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs mt-1.5">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
      {hint && !error && <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{hint}</p>}
    </div>
  )
}

// ─── Styled input ─────────────────────────────────────────────────────────────
const inputCls =
  'w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/30 transition min-w-0'

const selectCls = inputCls + ' cursor-pointer'

// ─── Icon input ──────────────────────────────────────────────────────────────
function IconInput({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="relative min-w-0">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
        {icon}
      </span>
      <div className="[&_input]:pl-9 [&_select]:pl-9">{children}</div>
    </div>
  )
}

// ─── Pill toggle (type selector) ─────────────────────────────────────────────
function TypeCard({
  type,
  selected,
  onClick,
}: {
  type: ReservationType
  selected: boolean
  onClick: () => void
}) {
  const meta = TYPE_META[type]
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all duration-150 w-full',
        selected
          ? cx(meta.bg, meta.color, 'border-current/40')
          : 'border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.05]'
      )}
    >
      <span className={cx('shrink-0', selected ? meta.color : 'text-gray-400')}>{meta.icon}</span>
      <div className="min-w-0">
        <div className={cx('text-sm font-semibold truncate', selected ? meta.color : 'text-gray-700 dark:text-gray-300')}>
          {meta.label}
        </div>
      </div>
      {selected && (
        <span className={cx('ml-auto shrink-0', meta.color)}>
          <CheckCircle2 size={16} />
        </span>
      )}
    </button>
  )
}

// ─── Summary sidebar card ─────────────────────────────────────────────────────
function SummarySidebar({
  summary,
  form,
  produits,
  forfaits,
}: {
  summary: { clientLabel: string; details: string; total: number; pay: number; pct: number }
  form: ReservationInput
  produits: any[]
  forfaits: any[]
}) {
  const meta = TYPE_META[form.type]
  return (
    <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-panel shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] flex items-center gap-2">
        <FileText size={15} className="text-gray-500 dark:text-gray-400 shrink-0" />
        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Résumé</span>
      </div>
      <div className="p-4 space-y-3">
        {/* Type badge */}
        <div className={cx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', meta.bg, meta.color)}>
          {meta.icon}
          {meta.label}
        </div>

        {/* Client */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">Client</div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {summary.clientLabel || <span className="text-gray-400 italic">Non sélectionné</span>}
          </div>
        </div>

        {/* Details */}
        {summary.details && summary.details !== '—' && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">Détails</div>
            <div className="text-sm text-gray-700 dark:text-gray-300 truncate">{summary.details}</div>
          </div>
        )}

        {/* Total */}
        {summary.total > 0 && (
          <div className="rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total</span>
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">{money(summary.total)}</span>
            </div>
            {summary.pay > 0 && (
              <>
                <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${summary.pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Acompte {money(summary.pay)}</span>
                  <span className="text-gray-400">{summary.pct}%</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Payment mode icon ───────────────────────────────────────────────────────
function PayModeIcon({ mode }: { mode: string }) {
  const icons: Record<string, React.ReactNode> = {
    especes: <Banknote size={14} />,
    wave: <Smartphone size={14} />,
    orange_money: <Smartphone size={14} />,
    virement: <Building2 size={14} />,
    carte: <CreditCard size={14} />,
    cheque: <FileText size={14} />,
  }
  return <span className="text-gray-400">{icons[mode] || <Banknote size={14} />}</span>
}

// ─── EMPTY / normalize (unchanged logic) ────────────────────────────────────
const EMPTY: ReservationInput = {
  type: 'billet_avion',
  client_mode: 'existing',
  client_id: null,
  nombre_personnes: 1,
  montant_total: 0,
  montant_sous_total: null,
  montant_taxes: null,
  notes: '',
  passenger_is_client: true,
  beneficiaries: [],
  passengers: [],
  passenger: { nom: '', prenom: '' },
  flight_details: {
    ville_depart: '',
    ville_arrivee: '',
    date_depart: '',
    date_arrivee: '',
    compagnie: '',
    pnr: '',
    classe: '',
  },
  assurance_details: { libelle: '', date_debut: '', date_fin: '' },
  evisa_details: { pays_destination: '', type_visa: '', date_voyage: '', duree_sejour: '' },
  produit_id: null,
  forfait_id: null,
  participants: [],
  acompte: { montant: 0, mode_paiement: 'especes', reference: '' },
}

function normalizeReservationToForm(dv?: Partial<ReservationInput>): ReservationInput {
  const v: any = dv || {}
  const type: ReservationType = (v.type as ReservationType) || 'billet_avion'
  const clientId = v.client_id ?? v.client?.id ?? null
  const flightFromBackend = v.flight_details ?? v.flightDetails ?? null
  const flight_details =
    type === 'billet_avion'
      ? {
          ville_depart: String(flightFromBackend?.ville_depart ?? v.ville_depart ?? ''),
          ville_arrivee: String(flightFromBackend?.ville_arrivee ?? v.ville_arrivee ?? ''),
          date_depart: String(flightFromBackend?.date_depart ?? v.date_depart ?? ''),
          date_arrivee: String(flightFromBackend?.date_arrivee ?? v.date_arrivee ?? ''),
          compagnie: String(flightFromBackend?.compagnie ?? v.compagnie ?? ''),
          pnr: String(flightFromBackend?.pnr ?? v.pnr ?? ''),
          classe: String(flightFromBackend?.classe ?? v.classe ?? ''),
        }
      : undefined
  const assuranceFromBackend = v.assurance_details ?? v.assuranceDetails ?? null
  const assurance_details =
    type === 'assurance'
      ? {
          libelle: String(assuranceFromBackend?.libelle ?? ''),
          date_debut: String(assuranceFromBackend?.date_debut ?? ''),
          date_fin: String(assuranceFromBackend?.date_fin ?? ''),
        }
      : undefined
  const evisaFromBackend = v.evisa_details ?? null
  const evisa_details =
    type === 'evisa'
      ? {
          pays_destination: String(evisaFromBackend?.pays_destination ?? ''),
          type_visa: String(evisaFromBackend?.type_visa ?? ''),
          date_voyage: String(evisaFromBackend?.date_voyage ?? ''),
          duree_sejour: String(evisaFromBackend?.duree_sejour ?? ''),
        }
      : undefined
  const participantsArr = Array.isArray(v.participants) ? v.participants : []
  const beneficiaries =
    type === 'billet_avion' || type === 'evisa'
      ? participantsArr
          .filter((p: any) => p?.role === 'passenger')
          .map((p: any) => ({ nom: String(p?.nom ?? ''), prenom: String(p?.prenom ?? ''), saved: true }))
      : []
  const passengerBackend = v.passenger ?? null
  const passenger_is_client =
    typeof v.passenger_is_client === 'boolean' ? v.passenger_is_client : passengerBackend ? false : true

  return {
    ...EMPTY,
    ...v,
    type,
    client_mode: v.client_mode || 'existing',
    client_id: clientId ? Number(clientId) : null,
    nombre_personnes: Number(v.nombre_personnes ?? 1),
    montant_sous_total: v.montant_sous_total != null ? Number(v.montant_sous_total) : null,
    montant_taxes: v.montant_taxes != null ? Number(v.montant_taxes) : null,
    montant_total: Number(v.montant_total ?? 0),
    notes: v.notes ?? '',
    passenger_is_client,
    beneficiaries,
    passenger:
      type === 'assurance' && !passenger_is_client
        ? { nom: String(passengerBackend?.nom ?? ''), prenom: String(passengerBackend?.prenom ?? '') }
        : { nom: '', prenom: '' },
    flight_details,
    assurance_details,
    evisa_details,
    ville_depart: v.ville_depart ?? flight_details?.ville_depart ?? null,
    ville_arrivee: v.ville_arrivee ?? flight_details?.ville_arrivee ?? null,
    date_depart: v.date_depart ?? (flight_details?.date_depart as any) ?? null,
    date_arrivee: v.date_arrivee ?? (flight_details?.date_arrivee as any) ?? null,
    compagnie: v.compagnie ?? (flight_details?.compagnie as any) ?? null,
    pnr: v.pnr ?? (flight_details?.pnr as any) ?? null,
    classe: v.classe ?? (flight_details?.classe as any) ?? null,
    produit_id: v.produit_id != null ? Number(v.produit_id) : null,
    forfait_id: v.forfait_id != null ? Number(v.forfait_id) : null,
    participants:
      type === 'forfait' || type === 'evenement'
        ? participantsArr.map((p: any) => ({
            nom: String(p?.nom ?? ''),
            prenom: p?.prenom ?? '',
            passport: p?.passport ?? '',
            age: p?.age ?? null,
            remarques: p?.remarques ?? '',
            role: p?.role ?? 'participant',
          }))
        : [],
    acompte: {
      montant: Number(v.acompte?.montant ?? 0),
      mode_paiement: String(v.acompte?.mode_paiement ?? 'especes'),
      reference: String(v.acompte?.reference ?? ''),
    },
  }
}

async function fetchAllPages<T = any>(
  url: string,
  params: Record<string, any>,
  { maxPages = 200, pageParam = 'page' }: { maxPages?: number; pageParam?: string } = {}
): Promise<T[]> {
  const items: T[] = []
  let page = 1
  let safety = 0
  while (safety < maxPages) {
    safety++
    const { data } = await api.get(url, { params: { ...params, [pageParam]: page } })
    const pageItems: T[] = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : []
    items.push(...pageItems)
    const meta = data?.meta
    const lastPage = Number(meta?.last_page || 0)
    if (lastPage && page >= lastPage) break
    const nextUrl = data?.links?.next
    if (typeof nextUrl === 'string') { page++; continue }
    if (!pageItems.length) break
    if (pageItems.length < 10) break
    page++
  }
  return items
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export function ReservationsForm({ defaultValues, submitting, onCancel, onSubmit }: Props) {
  const isEdit = Boolean((defaultValues as any)?.id)
  const [form, setForm] = useState<ReservationInput>(() => normalizeReservationToForm(defaultValues))
  const [step, setStep] = useState(0)
  const [beneficiaryDraft, setBeneficiaryDraft] = useState<BeneficiaryInput>({ nom: '', prenom: '' })
  const qc = useQueryClient()

  useEffect(() => {
    setForm(normalizeReservationToForm(defaultValues))
    setStep(0)
  }, [JSON.stringify(defaultValues || {})])

  // ── Queries ───────────────────────────────────────────────────────────────
  const qClients = useQuery({
    queryKey: ['clients', 'select-all'],
    queryFn: async () => fetchAllPages<any>('/clients', { per_page: 200 }),
  })
  const qProduits = useQuery({
    queryKey: ['produits', 'select-all'],
    queryFn: async () => {
      const { data } = await api.get('/produits', { params: { per_page: 300 } })
      return Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
    },
  })
  const qForfaits = useQuery({
    queryKey: ['forfaits', 'select-all'],
    queryFn: async () => {
      const { data } = await api.get('/forfaits', { params: { per_page: 300 } })
      return Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
    },
  })

  const clients: any[] = qClients.data || []
  const produits: any[] = qProduits.data || []
  const forfaits: any[] = qForfaits.data || []

  const produitsOfType = useMemo(
    () => (!form.type ? [] : produits.filter((p) => String(p?.type) === String(form.type))),
    [produits, form.type]
  )

  const selectedClient = useMemo(
    () => (!form.client_id ? null : clients.find((c) => Number(c?.id) === Number(form.client_id)) || null),
    [clients, form.client_id]
  )

  // ── Client autocomplete ───────────────────────────────────────────────────
  const [clientQuery, setClientQuery] = useState('')
  const [clientOpen, setClientOpen] = useState(false)
  const [clientHighlight, setClientHighlight] = useState(0)
  const blurTimeoutRef = useRef<number | null>(null)

  // Portal dropdown : position calculée à l'ouverture pour échapper au overflow-hidden du modal
  const clientInputWrapRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number; openUp: boolean }>({ top: 0, left: 0, width: 0, openUp: false })

  useLayoutEffect(() => {
    if (!clientOpen || !clientInputWrapRef.current) return
    const compute = () => {
      const el = clientInputWrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      // Décide si on ouvre vers le bas ou vers le haut selon l'espace disponible
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const dropdownMaxHeight = 320
      const openUp = spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow
      setDropdownPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUp,
      })
    }
    compute()
    // Recalcule sur scroll (à l'intérieur du modal) et resize
    window.addEventListener('scroll', compute, true)
    window.addEventListener('resize', compute)
    return () => {
      window.removeEventListener('scroll', compute, true)
      window.removeEventListener('resize', compute)
    }
  }, [clientOpen, clientQuery])

  useEffect(() => {
    if (selectedClient && form.client_mode === 'existing') {
      setClientQuery([selectedClient?.prenom, selectedClient?.nom].filter(Boolean).join(' ').trim())
    }
  }, [selectedClient?.id, form.client_mode])

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase()
    // Sans query : trier par date de création desc (plus récents en haut) — clients "récents"
    if (!q) {
      const sorted = [...clients].sort((a, b) => {
        const ta = new Date(a?.created_at || a?.updated_at || 0).getTime()
        const tb = new Date(b?.created_at || b?.updated_at || 0).getTime()
        return tb - ta
      })
      return sorted.slice(0, 10)
    }
    // Avec query : matche nom, prénom, téléphone, email
    return clients
      .filter((c) => {
        const nom = String(c?.nom || '').toLowerCase()
        const prenom = String(c?.prenom || '').toLowerCase()
        const tel = String(c?.telephone || '').toLowerCase().replace(/\s+/g, '')
        const email = String(c?.email || '').toLowerCase()
        const qNoSpace = q.replace(/\s+/g, '')
        return (
          nom.includes(q) ||
          prenom.includes(q) ||
          `${prenom} ${nom}`.includes(q) ||
          `${nom} ${prenom}`.includes(q) ||
          tel.includes(qNoSpace) ||
          email.includes(q)
        )
      })
      .slice(0, 30)
  }, [clients, clientQuery])

  const selectClient = (c: any) => {
    setForm((s) => ({ ...s, client_id: Number(c?.id) }))
    setClientQuery([c?.prenom, c?.nom].filter(Boolean).join(' ').trim())
    setClientOpen(false)
  }

  const createClientMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/clients', payload)
      return data?.data ?? data
    },
    onSuccess: async (created) => {
      await qc.invalidateQueries({ queryKey: ['clients', 'select-all'] })
      setForm((s) => ({
        ...s,
        client_mode: 'existing',
        client_id: created?.id ? Number(created.id) : s.client_id,
        client: { nom: '', prenom: '', email: '', telephone: '' },
      }))
      const label = [created?.prenom, created?.nom].filter(Boolean).join(' ').trim()
      if (label) setClientQuery(label)
    },
  })

  // ── Steps ─────────────────────────────────────────────────────────────────
  // Étapes "logiques" (indices fixes 0-4, on n'y touche jamais)
  const ALL_STEPS = useMemo(
    () => [
      { idx: 0, title: 'Type & client', subtitle: 'Choisir le type + le payeur' },
      { idx: 1, title: 'Détails',       subtitle: 'Vol / produit / forfait / assurance' },
      { idx: 2, title: 'Bénéficiaire',  subtitle: 'Payeur ou autres personnes' },
      { idx: 3, title: 'Montant',       subtitle: 'Total + notes' },
      { idx: 4, title: 'Acompte',       subtitle: 'Optionnel' },
    ],
    []
  )

  // Étape Bénéficiaire inutile pour hôtel et voiture → on la saute
  const skipBeneficiaryStep = useMemo(
    () => form.type === 'hotel' || form.type === 'voiture',
    [form.type]
  )

  // Étapes visibles (filtre l'étape Bénéficiaire si inutile)
  const visibleSteps = useMemo(
    () => (skipBeneficiaryStep ? ALL_STEPS.filter((s) => s.idx !== 2) : ALL_STEPS),
    [ALL_STEPS, skipBeneficiaryStep]
  )

  // Backward-compat : l'ancien `steps` reste basé sur les étapes visibles
  const steps = visibleSteps

  // ── Setters ───────────────────────────────────────────────────────────────
  const set = <K extends keyof ReservationInput>(key: K, value: ReservationInput[K]) =>
    setForm((s) => ({ ...s, [key]: value }))

  const setFlight = (patch: Partial<NonNullable<ReservationInput['flight_details']>>) =>
    setForm((s) => {
      const next = { ...s, flight_details: { ...(s.flight_details || (EMPTY.flight_details as any)), ...patch } }
      if (next.type === 'billet_avion' && next.flight_details) {
        next.ville_depart = next.flight_details.ville_depart
        next.ville_arrivee = next.flight_details.ville_arrivee
        next.date_depart = (next.flight_details.date_depart as any) ?? null
        next.date_arrivee = (next.flight_details.date_arrivee as any) ?? null
        next.compagnie = (next.flight_details.compagnie as any) ?? null
        next.pnr = (next.flight_details.pnr as any) ?? null
        next.classe = (next.flight_details.classe as any) ?? null
      }
      return next
    })

  const setAssurance = (patch: Partial<NonNullable<ReservationInput['assurance_details']>>) =>
    setForm((s) => ({
      ...s,
      assurance_details: { ...(s.assurance_details || (EMPTY.assurance_details as any)), ...patch } as any,
    }))

  const setEvisa = (patch: Partial<NonNullable<ReservationInput['evisa_details']>>) =>
    setForm((s) => ({
      ...s,
      evisa_details: { ...(s.evisa_details || (EMPTY.evisa_details as any)), ...patch } as any,
    }))

  const setPassenger = (patch: Partial<NonNullable<ReservationInput['passenger']>>) =>
    setForm((s) => ({ ...s, passenger: { ...(s.passenger || { nom: '', prenom: '' }), ...patch } as any }))

  const addParticipant = () =>
    setForm((s) => ({
      ...s,
      participants: [...(s.participants || []), { nom: '', prenom: '', passport: '', age: null, remarques: '', role: 'participant' }],
    }))

  const updateParticipant = (idx: number, patch: any) =>
    setForm((s) => ({
      ...s,
      participants: (s.participants || []).map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }))

  const removeParticipant = (idx: number) =>
    setForm((s) => ({ ...s, participants: (s.participants || []).filter((_, i) => i !== idx) }))

  const addBeneficiary = () => {
    const nom = String(beneficiaryDraft.nom || '').trim()
    const prenom = String(beneficiaryDraft.prenom || '').trim()
    if (!nom) return
    const current = form.beneficiaries || []
    if (current.length >= expectedBeneficiariesCount) return
    setForm((s) => ({ ...s, beneficiaries: [...(s.beneficiaries || []), { nom, prenom, saved: true }] }))
    setBeneficiaryDraft({ nom: '', prenom: '' })
  }

  const removeBeneficiary = (idx: number) =>
    setForm((s) => ({ ...s, beneficiaries: (s.beneficiaries || []).filter((_, i) => i !== idx) }))

  useEffect(() => {
    if (form.type === 'voiture' && form.nombre_personnes !== 1) set('nombre_personnes', 1)
  }, [form.type])

  const expectedBeneficiariesCount = useMemo(() => {
    if (form.type !== 'billet_avion' && form.type !== 'evisa') return 0
    const nb = Math.max(1, Number(form.nombre_personnes || 1))
    return form.passenger_is_client ? Math.max(0, nb - 1) : nb
  }, [form.type, form.nombre_personnes, form.passenger_is_client])

  useEffect(() => {
    if (form.type !== 'billet_avion' && form.type !== 'evisa') return
    setForm((s) => {
      const list = s.beneficiaries || []
      if (list.length <= expectedBeneficiariesCount) return s
      return { ...s, beneficiaries: list.slice(0, expectedBeneficiariesCount) }
    })
  }, [expectedBeneficiariesCount, form.type])

  // ── Validation ────────────────────────────────────────────────────────────
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (form.client_mode === 'existing' && !form.client_id) return 'Veuillez sélectionner un client.'
      if (form.client_mode === 'new' && !String(form.client?.nom || '').trim()) return 'Nom du client requis.'
      if (!form.type) return 'Type requis.'
      if (form.type === 'billet_avion' && Number(form.nombre_personnes || 0) < 1)
        return 'Le nombre de personnes doit être au minimum 1.'
    }
    if (s === 1) {
      if (form.type === 'billet_avion') return null
      if (form.type === 'assurance') {
        if (!isEdit) {
          if (!form.assurance_details?.libelle?.trim()) return 'Libellé assurance requis.'
          if (!form.assurance_details?.date_debut) return 'Date début requise.'
        }
        return null
      }
      if (form.type === 'evisa') {
        if (!isEdit) {
          if (!form.evisa_details?.pays_destination?.trim()) return 'Pays de destination requis.'
        }
        return null
      }
      if (form.type === 'forfait') {
        if (!form.forfait_id) return 'Veuillez sélectionner un forfait.'
      } else {
        if (!form.produit_id) return 'Veuillez sélectionner un produit.'
      }
    }
    if (s === 2) {
      if (form.type === 'billet_avion' || form.type === 'evisa') {
        if ((beneficiaryDraft.nom || '').trim() || (beneficiaryDraft.prenom || '').trim())
          return 'Cliquez sur "Ajouter" pour enregistrer le bénéficiaire en cours.'
        const current = (form.beneficiaries || []).filter((b) => String(b.nom || '').trim() !== '').length
        if (current !== expectedBeneficiariesCount) {
          const label = form.type === 'evisa' ? 'demandeurs' : 'bénéficiaires'
          return `Le nombre de ${label} doit être de ${expectedBeneficiariesCount}.`
        }
      }
      if (form.type === 'assurance' && !form.passenger_is_client && !form.passenger?.nom?.trim())
        return 'Nom du bénéficiaire requis.'
    }
    if (s === 3) {
      if (form.type === 'billet_avion' || form.type === 'assurance' || form.type === 'evisa') {
        if (Number(form.montant_sous_total || 0) <= 0) {
          return form.type === 'evisa' ? 'Frais de visa requis.' : 'Achat (hors fees) requis.'
        }
      } else {
        if (Number(form.montant_total || 0) <= 0) return 'Montant total requis.'
      }
    }
    return null
  }

  const canGoNext = validateStep(step) === null

  // Helpers : trouver l'étape visible suivante/précédente (saute les étapes filtrées)
  const findNextVisible = (from: number) => {
    const visibleIdxs = visibleSteps.map((s) => s.idx)
    return visibleIdxs.find((i) => i > from) ?? from
  }
  const findPrevVisible = (from: number) => {
    const visibleIdxs = visibleSteps.map((s) => s.idx)
    return [...visibleIdxs].reverse().find((i) => i < from) ?? from
  }

  // Si on change de type et que l'étape courante n'est plus visible, on saute à la suivante
  useEffect(() => {
    const visibleIdxs = visibleSteps.map((s) => s.idx)
    if (!visibleIdxs.includes(step)) {
      setStep(findNextVisible(step - 1))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSteps])

  const next = () => {
    if (validateStep(step)) return
    setStep(findNextVisible(step))
  }
  const prev = () => setStep(findPrevVisible(step))

  // ── Build payload (unchanged logic) ───────────────────────────────────────
  const buildPayload = (): ReservationInput => {
    const payload: any = { ...form }
    if (payload.client_mode === 'existing') delete payload.client
    else delete payload.client_id
    delete payload.client_mode
    const stNum = (v: any) => (v == null || v === '' ? 0 : Number(v) || 0)
    const toStr = (v: any) => String(v ?? '').trim()
    const toNullableStr = (v: any) => { const s = String(v ?? '').trim(); return s === '' ? null : s }
    const pickIfNonEmpty = (obj: any) => {
      const out: any = {}
      Object.entries(obj).forEach(([k, v]) => {
        if (v === undefined || v === null) return
        if (typeof v === 'string' && v.trim() === '') return
        out[k] = v
      })
      return out
    }
    if (payload.type === 'billet_avion') {
      const fd = {
        ville_depart: toStr(payload.flight_details?.ville_depart),
        ville_arrivee: toStr(payload.flight_details?.ville_arrivee),
        date_depart: toNullableStr(payload.flight_details?.date_depart),
        date_arrivee: toNullableStr(payload.flight_details?.date_arrivee),
        compagnie: toNullableStr(payload.flight_details?.compagnie),
        pnr: toNullableStr(payload.flight_details?.pnr),
        classe: toNullableStr(payload.flight_details?.classe),
      }
      if (isEdit) { Object.assign(payload, pickIfNonEmpty(fd)); delete payload.flight_details }
      else payload.flight_details = fd
      const cleanBeneficiaries = (payload.beneficiaries || [])
        .filter((b: any) => String(b?.nom || '').trim() !== '')
        .map((b: any) => ({ nom: toStr(b.nom), prenom: toNullableStr(b.prenom) }))
      const clientTravels = Boolean(payload.passenger_is_client)
      if (clientTravels) {
        payload.passenger_is_client = true
        payload.passengers = cleanBeneficiaries.length > 0 ? cleanBeneficiaries : undefined
        payload.nombre_personnes = 1 + cleanBeneficiaries.length
      } else {
        payload.passenger_is_client = false
        payload.passengers = cleanBeneficiaries
        payload.nombre_personnes = cleanBeneficiaries.length
      }
      delete payload.beneficiaries
      delete payload.passenger
      delete payload.participants
      delete payload.assurance_details
      delete payload.produit_id
      delete payload.forfait_id
      const st = stNum(payload.montant_sous_total)
      const tx = stNum(payload.montant_taxes)
      payload.montant_sous_total = st
      payload.montant_taxes = tx
      payload.montant_total = st + tx
    } else if (payload.type === 'assurance') {
      delete payload.flight_details
      delete payload.ville_depart; delete payload.ville_arrivee
      delete payload.date_depart; delete payload.date_arrivee
      delete payload.compagnie; delete payload.pnr; delete payload.classe
      delete payload.beneficiaries; delete payload.passengers
      payload.passenger_is_client = Boolean(payload.passenger_is_client)
      if (payload.passenger_is_client) delete payload.passenger
      else payload.passenger = { nom: toStr(payload.passenger?.nom), prenom: toNullableStr(payload.passenger?.prenom) }
      delete payload.participants; delete payload.produit_id; delete payload.forfait_id
      const st = stNum(payload.montant_sous_total)
      const tx = stNum(payload.montant_taxes)
      payload.montant_sous_total = st; payload.montant_taxes = tx
      payload.montant_total = Number(payload.montant_total ?? st + tx) || st + tx
      const ad = payload.assurance_details || {}
      const hasAny = ['libelle', 'date_debut', 'date_fin'].some((k) => ad[k] != null && String(ad[k]).trim() !== '')
      if (hasAny) payload.assurance_details = { libelle: toStr(ad.libelle), date_debut: toNullableStr(ad.date_debut), date_fin: toNullableStr(ad.date_fin) }
      else delete payload.assurance_details
    } else if (payload.type === 'evisa') {
      // Drop flight + assurance + product fields
      delete payload.flight_details
      delete payload.ville_depart; delete payload.ville_arrivee
      delete payload.date_depart; delete payload.date_arrivee
      delete payload.compagnie; delete payload.pnr; delete payload.classe
      delete payload.assurance_details
      delete payload.produit_id; delete payload.forfait_id
      delete payload.participants

      // Demandeurs — même logique que billet_avion
      const cleanDemandeurs = (payload.beneficiaries || [])
        .filter((b: any) => String(b?.nom || '').trim() !== '')
        .map((b: any) => ({ nom: toStr(b.nom), prenom: toNullableStr(b.prenom) }))

      const clientTravels = Boolean(payload.passenger_is_client)
      if (clientTravels) {
        payload.passenger_is_client = true
        payload.passengers = cleanDemandeurs.length > 0 ? cleanDemandeurs : undefined
        payload.nombre_personnes = 1 + cleanDemandeurs.length
      } else {
        payload.passenger_is_client = false
        payload.passengers = cleanDemandeurs
        payload.nombre_personnes = cleanDemandeurs.length || 1
      }

      delete payload.beneficiaries
      delete payload.passenger

      // evisa_details
      const ed = payload.evisa_details || {}
      const hasAny = ['pays_destination', 'type_visa', 'date_voyage', 'duree_sejour'].some(
        (k) => ed[k] != null && String(ed[k]).trim() !== ''
      )
      if (hasAny) {
        payload.evisa_details = {
          pays_destination: toStr(ed.pays_destination),
          type_visa:        toNullableStr(ed.type_visa),
          date_voyage:      toNullableStr(ed.date_voyage),
          duree_sejour:     toNullableStr(ed.duree_sejour),
        }
      } else {
        delete payload.evisa_details
      }

      const st = stNum(payload.montant_sous_total)
      const tx = stNum(payload.montant_taxes)
      payload.montant_sous_total = st; payload.montant_taxes = tx
      payload.montant_total = st + tx
    } else {
      delete payload.passenger_is_client; delete payload.passenger; delete payload.passengers
      delete payload.beneficiaries; delete payload.assurance_details; delete payload.evisa_details; delete payload.flight_details
      delete payload.ville_depart; delete payload.ville_arrivee
      delete payload.date_depart; delete payload.date_arrivee
      delete payload.compagnie; delete payload.pnr; delete payload.classe
      if (payload.type === 'forfait') delete payload.produit_id
      else if (payload.type !== 'forfait' && payload.type !== 'billet_avion') delete payload.forfait_id
      const shouldHaveParticipants = payload.type === 'forfait' || payload.type === 'evenement'
      if (!shouldHaveParticipants) delete payload.participants
      else payload.participants = (payload.participants || []).filter((p: any) => String(p?.nom || '').trim() !== '')
      payload.nombre_personnes = Number(payload.nombre_personnes || 1)
      payload.montant_total = Number(payload.montant_total || 0)
      delete payload.montant_sous_total; delete payload.montant_taxes
    }
    return payload as ReservationInput
  }

  const onFinalSubmit = (asDevis = false) => {
    // Itère sur les étapes visibles uniquement (avec leurs indices logiques)
    for (const s of visibleSteps) {
      const err = validateStep(s.idx)
      if (err) { setStep(s.idx); return }
    }
    const payload = buildPayload() as any
    if (asDevis) payload.as_devis = true
    onSubmit(payload)
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const clientLabelText =
      form.client_mode === 'existing'
        ? selectedClient
          ? [selectedClient?.prenom, selectedClient?.nom].filter(Boolean).join(' ') || `Client #${selectedClient.id}`
          : '—'
        : [form.client?.prenom, form.client?.nom].filter(Boolean).join(' ') || form.client?.nom || 'Nouveau client'
    const details =
      form.type === 'billet_avion'
        ? `${form.flight_details?.ville_depart || '—'} → ${form.flight_details?.ville_arrivee || '—'}`
        : form.type === 'assurance'
        ? form.assurance_details?.libelle || '—'
        : form.type === 'evisa'
        ? form.evisa_details?.pays_destination || '—'
        : form.type === 'forfait'
        ? forfaits.find((f) => Number(f?.id) === Number(form.forfait_id))?.nom || '—'
        : produits.find((p) => Number(p?.id) === Number(form.produit_id))?.nom || '—'
    const total =
      form.type === 'billet_avion' || form.type === 'assurance' || form.type === 'evisa'
        ? Number(form.montant_sous_total || 0) + Number(form.montant_taxes || 0)
        : Number(form.montant_total || 0)
    const pay = Number(form.acompte?.montant || 0)
    const pct = total > 0 ? Math.min(100, Math.round((pay / total) * 100)) : 0
    return { clientLabel: clientLabelText, details, total, pay, pct }
  }, [form, selectedClient, produits, forfaits])

  const stepError = validateStep(step)

  // ══════════════════════════════════════════════════════════════════════════
  // STEP RENDERS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Step 0: Type & Client ─────────────────────────────────────────────────
  const Step0 = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0">
      {/* Type de réservation */}
      <Section title="Type de réservation" icon={<Ticket size={15} />}>
        <div className="grid grid-cols-1 gap-3">
          <Field label="Type" required hint={TYPE_META[form.type]?.hint}>
            <select
              className={selectCls}
              value={form.type}
              onChange={(e) => {
                const t = e.target.value as ReservationType
                set('type', t)
                set('produit_id', null)
                set('forfait_id', null)
                if (t !== 'billet_avion') set('flight_details', undefined)
                if (t !== 'assurance') set('assurance_details', undefined)
                if (t !== 'evisa') set('evisa_details', undefined)
              }}
            >
              {(Object.keys(TYPE_META) as ReservationType[]).map((k) => (
                <option key={k} value={k}>{TYPE_META[k].label}</option>
              ))}
            </select>
          </Field>

          <Field label="Nombre de personnes" hint={
            form.type === 'voiture' ? 'Voiture : 1 réservation = 1 personne.'
            : form.type === 'billet_avion' ? 'Nombre total de billets.'
            : 'Nombre total de personnes concernées.'
          }>
            <div className="flex items-center gap-2 w-fit">
              <button
                type="button"
                onClick={() => set('nombre_personnes', Math.max(1, Number(form.nombre_personnes || 1) - 1))}
                disabled={form.type === 'voiture' || Number(form.nombre_personnes || 1) <= 1}
                className="w-9 h-9 rounded-xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] flex items-center justify-center text-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                −
              </button>
              <span className="w-10 text-center text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {form.nombre_personnes ?? 1}
              </span>
              <button
                type="button"
                onClick={() => set('nombre_personnes', Number(form.nombre_personnes || 1) + 1)}
                disabled={form.type === 'voiture'}
                className="w-9 h-9 rounded-xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] flex items-center justify-center text-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                +
              </button>
            </div>
          </Field>
        </div>
      </Section>

      {/* Client (payeur) */}
      <Section title="Client (payeur)" icon={<User size={15} />}>
          {/* Mode selector — 2 cartes visuelles */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {([
              {
                mode: 'existing' as const,
                icon: <UserCheck size={16} />,
                label: 'Client existant',
                hint: `${clients.length} client${clients.length > 1 ? 's' : ''} en base`,
              },
              {
                mode: 'new' as const,
                icon: <UserPlus size={16} />,
                label: 'Nouveau client',
                hint: 'Créer un compte',
              },
            ]).map(({ mode, icon, label, hint }) => {
              const active = form.client_mode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => set('client_mode', mode)}
                  className={cx(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all duration-150',
                    active
                      ? 'border-[var(--ut-orange)] bg-[var(--ut-orange)]/5'
                      : 'border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:border-black/15 dark:hover:border-white/15'
                  )}
                >
                  <div className={cx(
                    'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    active
                      ? 'bg-[var(--ut-orange)] text-white'
                      : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400'
                  )}>
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cx(
                      'text-[13px] font-semibold leading-tight',
                      active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
                    )}>
                      {label}
                    </div>
                    <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                      {hint}
                    </div>
                  </div>
                  {active && (
                    <CheckCircle2 size={14} className="shrink-0 text-[var(--ut-orange)]" />
                  )}
                </button>
              )
            })}
          </div>

          {form.client_mode === 'existing' ? (
            <div className="space-y-3">
              {/* Client sélectionné — carte visible en haut */}
              {selectedClient && (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-3 py-2.5">
                  <ClientAvatar client={selectedClient} active />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {[selectedClient?.prenom, selectedClient?.nom].filter(Boolean).join(' ') || `Client #${selectedClient?.id}`}
                      </div>
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-3 mt-0.5">
                      {selectedClient?.telephone && (
                        <span className="inline-flex items-center gap-1"><Phone size={10} />{selectedClient.telephone}</span>
                      )}
                      {selectedClient?.email && (
                        <span className="inline-flex items-center gap-1 truncate"><Mail size={10} />{selectedClient.email}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { set('client_id', null); setClientQuery('') }}
                    className="shrink-0 w-7 h-7 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center transition"
                    title="Changer de client"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Champ de recherche (caché si client sélectionné, sauf si on veut changer) */}
              {!selectedClient && (
                <Field label="Rechercher un client" required hint="Tapez un nom, prénom, téléphone ou email">
                  <div className="relative" ref={clientInputWrapRef}>
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      className={cx(inputCls, 'pl-9 pr-9')}
                      placeholder="Rechercher…"
                      value={clientQuery}
                      onChange={(e) => { setClientQuery(e.target.value); setClientOpen(true); setClientHighlight(0) }}
                      onFocus={() => { if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current); setClientOpen(true) }}
                      onBlur={() => { blurTimeoutRef.current = window.setTimeout(() => setClientOpen(false), 150) }}
                      onKeyDown={(e) => {
                        if (!clientOpen) return
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setClientHighlight((h) => Math.min(h + 1, filteredClients.length - 1))
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setClientHighlight((h) => Math.max(h - 1, 0))
                        } else if (e.key === 'Enter') {
                          e.preventDefault()
                          const c = filteredClients[clientHighlight]
                          if (c) selectClient(c)
                        } else if (e.key === 'Escape') {
                          setClientOpen(false)
                        }
                      }}
                    />
                    {clientQuery && (
                      <button
                        type="button"
                        onClick={() => { setClientQuery(''); setClientHighlight(0) }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center transition"
                        tabIndex={-1}
                      >
                        <X size={12} />
                      </button>
                    )}
                    {qClients.isLoading && !clientQuery && (
                      <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                    )}

                    {clientOpen && createPortal(
                      <div
                        className="fixed z-[10000] rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-panel shadow-xl overflow-hidden"
                        style={{
                          top: dropdownPos.openUp ? undefined : dropdownPos.top,
                          bottom: dropdownPos.openUp ? window.innerHeight - dropdownPos.top : undefined,
                          left: dropdownPos.left,
                          width: dropdownPos.width,
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {/* Header dropdown */}
                        <div className="px-3 py-2 border-b border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
                          <span className="text-[10.5px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {clientQuery ? `${filteredClients.length} résultat${filteredClients.length > 1 ? 's' : ''}` : 'Clients récents'}
                          </span>
                          {filteredClients.length > 0 && (
                            <span className="text-[9.5px] text-gray-400 hidden sm:inline">
                              ↑↓ Naviguer · ⏎ Choisir
                            </span>
                          )}
                        </div>

                        <div className="max-h-[280px] overflow-y-auto p-1">
                          {filteredClients.length === 0 ? (
                            <div className="px-3 py-6 text-center">
                              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Aucun client trouvé</div>
                              <button
                                type="button"
                                onClick={() => set('client_mode', 'new')}
                                className="text-xs font-medium text-[var(--ut-orange)] hover:underline inline-flex items-center gap-1"
                              >
                                <UserPlus size={11} />
                                Créer un nouveau client
                              </button>
                            </div>
                          ) : (
                            filteredClients.map((c, idx) => {
                              const isActive = Number(c?.id) === Number(form.client_id)
                              const isHighlight = idx === clientHighlight
                              const fullName = [c?.prenom, c?.nom].filter(Boolean).join(' ') || `Client #${c?.id}`
                              return (
                                <button
                                  key={c?.id}
                                  type="button"
                                  onClick={() => selectClient(c)}
                                  onMouseEnter={() => setClientHighlight(idx)}
                                  className={cx(
                                    'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors text-left',
                                    isHighlight && 'bg-gray-50 dark:bg-white/[0.06]',
                                    isActive && 'ring-1 ring-[var(--ut-orange)]/40'
                                  )}
                                >
                                  <ClientAvatar client={c} />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                                      {fullName}
                                    </div>
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                      {c?.telephone || '—'}{c?.email ? ` · ${c.email}` : ''}
                                    </div>
                                  </div>
                                  {isActive && (
                                    <CheckCircle2 size={14} className="text-[var(--ut-orange)] shrink-0" />
                                  )}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                </Field>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nom" required>
                  <input className={inputCls} value={form.client?.nom ?? ''} onChange={(e) => set('client', { ...(form.client || {}), nom: e.target.value })} />
                </Field>
                <Field label="Prénom">
                  <input className={inputCls} value={form.client?.prenom ?? ''} onChange={(e) => set('client', { ...(form.client || {}), prenom: e.target.value })} />
                </Field>
                <Field label="Téléphone">
                  <input className={inputCls} value={form.client?.telephone ?? ''} onChange={(e) => set('client', { ...(form.client || {}), telephone: e.target.value })} />
                </Field>
                <Field label="Email">
                  <input className={inputCls} type="email" value={form.client?.email ?? ''} onChange={(e) => set('client', { ...(form.client || {}), email: e.target.value })} />
                </Field>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="px-4 py-2 text-sm rounded-xl border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition"
                  onClick={() => setForm((s) => ({ ...s, client: { nom: '', prenom: '', email: '', telephone: '' } }))}
                  disabled={createClientMutation.isPending}
                >
                  Vider
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-sm rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:bg-gray-700 dark:hover:bg-gray-100 transition inline-flex items-center gap-2 disabled:opacity-50"
                  disabled={createClientMutation.isPending}
                  onClick={() => {
                    const c = form.client || {}
                    if (!String(c.nom || '').trim()) return
                    createClientMutation.mutate({ nom: String(c.nom).trim(), prenom: c.prenom ? String(c.prenom).trim() : null, telephone: c.telephone ? String(c.telephone).trim() : null, email: c.email ? String(c.email).trim() : null })
                  }}
                >
                  {createClientMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Enregistrer le client
                </button>
              </div>
            </div>
          )}
        </Section>
    </div>
  )

  // ── Step 1: Détails ───────────────────────────────────────────────────────
  const Step1 = (
    <div className="min-w-0">
      <Section title="Détails de la réservation" icon={<FileText size={15} />}>
        {form.type === 'billet_avion' ? (
          <div className="space-y-4">
            {/* Route visuelle */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <Field label="Ville départ">
                  <IconInput icon={<MapPin size={15} />}>
                    <input className={inputCls} placeholder="Ex: Dakar" value={form.flight_details?.ville_depart ?? ''} onChange={(e) => setFlight({ ville_depart: e.target.value })} />
                  </IconInput>
                </Field>
              </div>
              <div className="shrink-0 mt-5 text-gray-300 dark:text-gray-600">
                <ArrowRight size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <Field label="Ville arrivée">
                  <IconInput icon={<MapPin size={15} />}>
                    <input className={inputCls} placeholder="Ex: Paris" value={form.flight_details?.ville_arrivee ?? ''} onChange={(e) => setFlight({ ville_arrivee: e.target.value })} />
                  </IconInput>
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Date départ">
                <IconInput icon={<Calendar size={15} />}>
                  <input type="date" className={inputCls} value={String(form.flight_details?.date_depart ?? '')} onChange={(e) => setFlight({ date_depart: e.target.value })} />
                </IconInput>
              </Field>
              <Field label="Date arrivée">
                <IconInput icon={<Calendar size={15} />}>
                  <input type="date" className={inputCls} value={String(form.flight_details?.date_arrivee ?? '')} onChange={(e) => setFlight({ date_arrivee: e.target.value })} />
                </IconInput>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Compagnie">
                <input className={inputCls} placeholder="Ex: Air France" value={String(form.flight_details?.compagnie ?? '')} onChange={(e) => setFlight({ compagnie: e.target.value })} />
              </Field>
              <Field label="Classe">
                <select className={selectCls} value={String(form.flight_details?.classe ?? '')} onChange={(e) => setFlight({ classe: e.target.value })}>
                  <option value="">— Choisir —</option>
                  <option value="economique">Économique</option>
                  <option value="business">Business</option>
                  <option value="premiere">Première</option>
                </select>
              </Field>
              <Field label="PNR" hint="Code de réservation">
                <input className={inputCls} placeholder="Ex: CSSUNO" value={String(form.flight_details?.pnr ?? '')} onChange={(e) => setFlight({ pnr: e.target.value })} />
              </Field>
            </div>
          </div>
        ) : form.type === 'assurance' ? (
          <div className="space-y-4">
            <Field label={isEdit ? 'Libellé (optionnel en modification)' : 'Libellé'} required={!isEdit}>
              <input className={inputCls} placeholder="Ex: Assurance Voyage — Schengen" value={form.assurance_details?.libelle ?? ''} onChange={(e) => setAssurance({ libelle: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={isEdit ? 'Date début (optionnel)' : 'Date début'} required={!isEdit}>
                <IconInput icon={<Calendar size={15} />}>
                  <input type="date" className={inputCls} value={String(form.assurance_details?.date_debut ?? '')} onChange={(e) => setAssurance({ date_debut: e.target.value })} />
                </IconInput>
              </Field>
              <Field label="Date fin">
                <IconInput icon={<Calendar size={15} />}>
                  <input type="date" className={inputCls} value={String(form.assurance_details?.date_fin ?? '')} onChange={(e) => setAssurance({ date_fin: e.target.value })} />
                </IconInput>
              </Field>
            </div>
          </div>
        ) : form.type === 'evisa' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={isEdit ? 'Pays de destination (optionnel)' : 'Pays de destination'} required={!isEdit}>
                <IconInput icon={<Globe size={15} />}>
                  <input className={inputCls} placeholder="Ex: France, Canada, Schengen…" value={form.evisa_details?.pays_destination ?? ''} onChange={(e) => setEvisa({ pays_destination: e.target.value })} />
                </IconInput>
              </Field>
              <Field label="Type de visa">
                <select className={selectCls} value={form.evisa_details?.type_visa ?? ''} onChange={(e) => setEvisa({ type_visa: e.target.value || null })}>
                  <option value="">— Choisir —</option>
                  <option value="touriste">Touriste</option>
                  <option value="affaires">Affaires</option>
                  <option value="transit">Transit</option>
                  <option value="etudiant">Étudiant</option>
                  <option value="travail">Travail</option>
                  <option value="famille">Regroupement familial</option>
                  <option value="autre">Autre</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Date de voyage">
                <IconInput icon={<Calendar size={15} />}>
                  <input type="date" className={inputCls} value={String(form.evisa_details?.date_voyage ?? '')} onChange={(e) => setEvisa({ date_voyage: e.target.value || null })} />
                </IconInput>
              </Field>
              <Field label="Durée de séjour" hint="Ex: 30 jours, 3 mois, 1 an…">
                <input className={inputCls} placeholder="Ex: 30 jours" value={String(form.evisa_details?.duree_sejour ?? '')} onChange={(e) => setEvisa({ duree_sejour: e.target.value || null })} />
              </Field>
            </div>
          </div>
        ) : form.type === 'forfait' ? (
          <Field label="Forfait" required>
            <select className={selectCls} value={form.forfait_id ?? ''} onChange={(e) => set('forfait_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Sélectionner un forfait —</option>
              {forfaits.map((f) => <option key={f.id} value={f.id}>{f?.nom || `Forfait #${f?.id}`}</option>)}
            </select>
          </Field>
        ) : (
          <Field label="Produit" required>
            <select className={selectCls} value={form.produit_id ?? ''} onChange={(e) => set('produit_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Sélectionner un produit —</option>
              {(produitsOfType.length > 0 ? produitsOfType : produits).map((p) => <option key={p.id} value={p.id}>{p?.nom || `Produit #${p?.id}`}</option>)}
            </select>
          </Field>
        )}
      </Section>
    </div>
  )

  // ── Step 2: Bénéficiaires ─────────────────────────────────────────────────
  const Step2 = (
    <div className="min-w-0">
      <div className="space-y-4">
        {form.type === 'billet_avion' || form.type === 'evisa' ? (
          <Section
            title={form.type === 'evisa' ? 'Demandeurs du visa' : 'Bénéficiaires du vol'}
            icon={<Users size={15} />}
            badge={
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30">
                {(form.beneficiaries || []).length} / {expectedBeneficiariesCount}
              </span>
            }
          >
            {/* Client voyage toggle */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] mb-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {form.type === 'evisa' ? 'Le client fait partie des demandeurs' : 'Le client voyage'}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {form.type === 'evisa' ? 'Le payeur est aussi demandeur' : 'Le payeur est aussi passager'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => set('passenger_is_client', !form.passenger_is_client)}
                className={cx(
                  'relative w-11 h-6 rounded-full transition-all duration-200 shrink-0',
                  form.passenger_is_client ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-white/10'
                )}
              >
                <span className={cx(
                  'absolute top-1 left-1 w-4 h-4 rounded-full bg-white dark:bg-gray-900 shadow transition-transform duration-200',
                  form.passenger_is_client ? 'translate-x-5' : 'translate-x-0'
                )} />
              </button>
            </div>

            {/* Add beneficiary */}
            {(form.beneficiaries || []).length < expectedBeneficiariesCount && (
              <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 p-3 mb-3">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Ajouter un passager
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <Field label="Nom">
                    <input className={inputCls} value={beneficiaryDraft.nom} onChange={(e) => setBeneficiaryDraft((d) => ({ ...d, nom: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBeneficiary())} />
                  </Field>
                  <Field label="Prénom">
                    <input className={inputCls} value={beneficiaryDraft.prenom ?? ''} onChange={(e) => setBeneficiaryDraft((d) => ({ ...d, prenom: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBeneficiary())} />
                  </Field>
                  <button
                    type="button"
                    onClick={addBeneficiary}
                    disabled={!beneficiaryDraft.nom.trim()}
                    className="h-[42px] px-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-700 dark:hover:bg-gray-100 transition disabled:opacity-30 inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Plus size={14} />
                    Ajouter
                  </button>
                </div>
              </div>
            )}

            {/* Beneficiary list */}
            <div className="space-y-2">
              {(form.beneficiaries || []).map((b, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] px-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center shrink-0">
                    <Plane size={12} className="text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {[b.prenom, b.nom].filter(Boolean).join(' ')}
                    </div>
                    <div className="text-xs text-gray-400">Passager {idx + 1}</div>
                  </div>
                  <button type="button" onClick={() => removeBeneficiary(idx)} className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition shrink-0">
                    <X size={15} />
                  </button>
                </div>
              ))}

              {expectedBeneficiariesCount === 0 && (
                <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-3">
                  Aucun passager additionnel requis.
                </div>
              )}
            </div>
          </Section>
        ) : form.type === 'assurance' ? (
          <Section title="Bénéficiaire de l'assurance" icon={<Shield size={15} />}>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] mb-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Le client est le bénéficiaire</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Le payeur est aussi assuré</div>
              </div>
              <button
                type="button"
                onClick={() => set('passenger_is_client', !form.passenger_is_client)}
                className={cx(
                  'relative w-11 h-6 rounded-full transition-all duration-200 shrink-0',
                  form.passenger_is_client ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-white/10'
                )}
              >
                <span className={cx(
                  'absolute top-1 left-1 w-4 h-4 rounded-full bg-white dark:bg-gray-900 shadow transition-transform duration-200',
                  form.passenger_is_client ? 'translate-x-5' : 'translate-x-0'
                )} />
              </button>
            </div>

            {!form.passenger_is_client && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nom du bénéficiaire" required>
                  <input className={inputCls} value={form.passenger?.nom ?? ''} onChange={(e) => setPassenger({ nom: e.target.value })} />
                </Field>
                <Field label="Prénom">
                  <input className={inputCls} value={form.passenger?.prenom ?? ''} onChange={(e) => setPassenger({ prenom: e.target.value })} />
                </Field>
              </div>
            )}
          </Section>
        ) : (form.type === 'forfait' || form.type === 'evenement') ? (
          <Section
            title="Participants"
            icon={<Users size={15} />}
            badge={
              <button
                type="button"
                onClick={addParticipant}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition"
              >
                <Plus size={12} />
                Ajouter
              </button>
            }
          >
            {(form.participants || []).length === 0 ? (
              <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                Aucun participant. Cliquez sur "Ajouter" pour en ajouter.
              </div>
            ) : (
              <div className="space-y-4">
                {(form.participants || []).map((p, idx) => (
                  <div key={idx} className="rounded-xl border border-black/[0.07] dark:border-white/[0.08] overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-white/[0.03] border-b border-black/[0.05] dark:border-white/[0.06]">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Participant {idx + 1}</span>
                      <button type="button" onClick={() => removeParticipant(idx)} className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Field label="Nom">
                        <input className={inputCls} value={p.nom} onChange={(e) => updateParticipant(idx, { nom: e.target.value })} />
                      </Field>
                      <Field label="Prénom">
                        <input className={inputCls} value={p.prenom ?? ''} onChange={(e) => updateParticipant(idx, { prenom: e.target.value })} />
                      </Field>
                      <Field label="Passeport">
                        <input className={inputCls} value={p.passport ?? ''} onChange={(e) => updateParticipant(idx, { passport: e.target.value })} />
                      </Field>
                      <Field label="Âge">
                        <input type="number" className={inputCls} value={p.age ?? ''} onChange={(e) => updateParticipant(idx, { age: e.target.value ? Number(e.target.value) : null })} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        ) : (
          <Section title="Bénéficiaires" icon={<Users size={15} />}>
            <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
              Aucun participant requis pour ce type de réservation.
            </div>
          </Section>
        )}
      </div>
    </div>
  )

  // ── Step 3: Montant ───────────────────────────────────────────────────────
  const Step3 = (
    <div className="min-w-0">
      <Section title="Montants & Notes" icon={<Receipt size={15} />}>
        <div className="space-y-4">
          {form.type === 'billet_avion' || form.type === 'assurance' || form.type === 'evisa' ? (
            <>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-3 py-2.5 flex items-start gap-2">
                <Receipt size={14} className="text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                    {form.type === 'assurance' ? 'Assurance — Tarification' : form.type === 'evisa' ? 'E-Visa — Tarification' : "Billet d'avion — Tarification"}
                  </div>
                  <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                    {form.type === 'evisa' ? 'Frais de visa + fees (commission).' : "Saisissez le prix d'achat hors fees, puis vos fees (commission)."}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={form.type === 'evisa' ? 'Frais de visa' : 'Achat (hors fees)'} required>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      className={cx(inputCls, 'pr-14')}
                      value={form.montant_sous_total ?? ''}
                      onChange={(e) => set('montant_sous_total', e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="Ex: 150 000"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">XOF</span>
                  </div>
                </Field>
                <Field label="Fees (commission)">
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      className={cx(inputCls, 'pr-14')}
                      value={form.montant_taxes ?? ''}
                      onChange={(e) => set('montant_taxes', e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="Ex: 10 000"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">XOF</span>
                  </div>
                </Field>
              </div>

              {/* Total preview */}
              {(Number(form.montant_sous_total) + Number(form.montant_taxes)) > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] px-4 py-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total calculé</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {money(Number(form.montant_sous_total || 0) + Number(form.montant_taxes || 0))}
                  </span>
                </div>
              )}
            </>
          ) : (
            <Field label="Montant total" required>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  className={cx(inputCls, 'pr-14')}
                  value={form.montant_total ?? ''}
                  onChange={(e) => set('montant_total', e.target.value === '' ? undefined : Number(e.target.value))}
                  placeholder="Ex: 200 000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">XOF</span>
              </div>
            </Field>
          )}

          <Field label="Référence" hint="Numéro de réservation externe (optionnel)">
            <input className={inputCls} value={String(form.reference ?? '')} onChange={(e) => set('reference', e.target.value || null)} placeholder="Ex: CONF-12345" />
          </Field>

          <Field label="Notes internes">
            <textarea className={cx(inputCls, 'min-h-[100px] resize-none')} value={String(form.notes ?? '')} onChange={(e) => set('notes', e.target.value)} placeholder="Informations complémentaires…" />
          </Field>
        </div>
      </Section>
    </div>
  )

  // ── Step 4: Acompte ───────────────────────────────────────────────────────
  const PAYMENT_MODES = [
    { value: 'especes', label: 'Espèces' },
    { value: 'wave', label: 'Wave' },
    { value: 'orange_money', label: 'Orange Money' },
    { value: 'virement', label: 'Virement' },
    { value: 'carte', label: 'Carte' },
    { value: 'cheque', label: 'Chèque' },
  ]

  const Step4 = (
    <div className="min-w-0">
      <div className="space-y-4">
        <Section title="Acompte" icon={<Banknote size={15} />} badge={<span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Optionnel</span>}>
          <div className="space-y-4">
            {/* Mode de paiement — pill buttons */}
            <Field label="Mode de paiement">
              <div className="flex flex-wrap gap-2 mt-1">
                {PAYMENT_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => set('acompte', { ...(form.acompte || {}), mode_paiement: m.value })}
                    className={cx(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border font-medium transition-all',
                      form.acompte?.mode_paiement === m.value
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
                        : 'bg-white dark:bg-white/[0.04] text-gray-600 dark:text-gray-400 border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.07]'
                    )}
                  >
                    <PayModeIcon mode={m.value} />
                    {m.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Montant de l'acompte">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    className={cx(inputCls, 'pr-14')}
                    value={form.acompte?.montant === undefined || form.acompte?.montant === null ? '' : String(form.acompte.montant)}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '') {
                        const next = { ...(form.acompte || {}) }
                        delete (next as any).montant
                        set('acompte', next)
                        return
                      }
                      set('acompte', { ...(form.acompte || {}), montant: Number(raw) })
                    }}
                    placeholder="Ex: 50 000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">XOF</span>
                </div>
              </Field>

              <Field label="Référence du paiement">
                <input
                  className={inputCls}
                  placeholder="Ex: TXN-00123"
                  value={form.acompte?.reference ?? ''}
                  onChange={(e) => set('acompte', { ...(form.acompte || {}), reference: e.target.value })}
                />
              </Field>
            </div>

            {/* Acompte progress */}
            {summary.total > 0 && summary.pay > 0 && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Acompte versé</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{summary.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-emerald-100 dark:bg-emerald-500/20 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${summary.pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1.5">
                  <span>{money(summary.pay)} versé</span>
                  <span>{money(summary.total - summary.pay)} restant</span>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Quick check */}
        <Section title="Vérification rapide" icon={<CheckCircle2 size={15} />}>
          <ul className="space-y-2">
            {[
              { ok: !!form.client_id || !!form.client?.nom, label: 'Client sélectionné' },
              {
                ok: form.type === 'billet_avion'
                  ? !!(form.flight_details?.ville_depart && form.flight_details?.ville_arrivee)
                  : form.type === 'assurance'
                  ? !!form.assurance_details?.libelle
                  : form.type === 'evisa'
                  ? !!form.evisa_details?.pays_destination
                  : form.type === 'forfait'
                  ? !!form.forfait_id
                  : !!form.produit_id,
                label: 'Détails renseignés',
              },
              {
                ok: form.type === 'billet_avion' || form.type === 'assurance' || form.type === 'evisa'
                  ? Number(form.montant_sous_total || 0) > 0
                  : Number(form.montant_total || 0) > 0,
                label: 'Montant saisi',
              },
            ].map(({ ok, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm">
                <span className={cx('w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                  ok ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-white/[0.06] text-gray-300 dark:text-gray-600'
                )}>
                  {ok ? <CheckCircle2 size={12} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                </span>
                <span className={ok ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>{label}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  )

  const currentStepUI = [Step0, Step1, Step2, Step3, Step4][step]

  // Conversion : step logique (0-4) ↔ position dans la liste visible
  const currentVisiblePosition = Math.max(0, visibleSteps.findIndex((s) => s.idx === step))
  const firstVisibleIdx = visibleSteps[0]?.idx ?? 0
  const lastVisibleIdx = visibleSteps[visibleSteps.length - 1]?.idx ?? 4
  const isAtFirstStep = step === firstVisibleIdx
  const isAtLastStep = step === lastVisibleIdx

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-0 min-w-0">
      {/* Stepper */}
      <Stepper
        steps={steps}
        current={currentVisiblePosition}
        onGo={(i) => { const target = visibleSteps[i]; if (target) setStep(target.idx) }}
        title={isEdit ? 'Modifier la réservation' : 'Nouvelle réservation'}
      />

      {/* Warning banner */}
      {stepError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 px-4 py-3 text-sm mb-4">
          <AlertCircle size={15} className="shrink-0" />
          {stepError}
        </div>
      )}

      {/* Step content */}
      <div className="mb-4">
        {currentStepUI}
      </div>

      {/* Navigation footer — sticky en bas du modal pour rester accessible même si le contenu défile */}
      <div className="sticky bottom-0 left-0 right-0 -mx-4 px-4 pt-3 pb-3 -mb-4 bg-white/95 dark:bg-panel/95 backdrop-blur-sm border-t border-black/[0.06] dark:border-white/[0.08] z-10 flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onCancel}
          disabled={!!submitting}
          className="px-4 py-2 text-sm rounded-xl border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition disabled:opacity-40"
        >
          Annuler
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={isAtFirstStep || !!submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition disabled:opacity-30"
          >
            <ChevronLeft size={15} />
            Précédent
          </button>

          {!isAtLastStep ? (
            <button
              type="button"
              onClick={next}
              disabled={!canGoNext || !!submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold hover:bg-gray-700 dark:hover:bg-gray-100 transition disabled:opacity-30"
            >
              Suivant
              <ChevronRight size={15} />
            </button>
          ) : (
            <>
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => onFinalSubmit(true)}
                  disabled={!!submitting}
                  title="Crée la réservation en statut 'en attente' (devis) sans la confirmer immédiatement"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition disabled:opacity-40"
                >
                  <FileText size={14} />
                  Enregistrer comme devis
                </button>
              )}
              <button
                type="button"
                onClick={() => onFinalSubmit(false)}
                disabled={!!submitting}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold hover:bg-gray-700 dark:hover:bg-gray-100 transition disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                {isEdit ? 'Enregistrer' : 'Confirmer la réservation'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
