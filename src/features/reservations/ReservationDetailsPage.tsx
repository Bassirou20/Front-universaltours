// src/features/reservations/ReservationDetailsPage.tsx
import React, { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useToast } from '../../ui/Toasts'
import { useSidebar } from '../../store/sidebar'
import { Modal } from '../../ui/Modal'
import { ReservationsForm, type ReservationInput } from './ReservationsForm'
import {
  Plane, Hotel, Car, PartyPopper, Package, User, Users,
  Receipt, FileText, Calendar, MapPin, Phone, Mail, Globe,
  ClipboardList, BadgeCheck, BadgeAlert, Info, Download,
  CreditCard, Zap, Building2, Route, Clock, Ticket, Tag,
  Shield, RefreshCw, ArrowRight, CheckCircle2, XCircle,
  Banknote, Smartphone, Building, LandmarkIcon, TrendingUp,
  ChevronLeft, Pencil, Loader2, AlertCircle, Stamp,
  AlertTriangle, PiggyBank,
} from 'lucide-react'
import PenaltyModal from './PenaltyModal'
import WhatsAppSendModal from '../../ui/WhatsAppSendModal'

/* ─── helpers ──────────────────────────────────────────────────────────────── */
function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ')
}

const money = (n: any, devise = 'XOF') =>
  `${Number(String(n ?? 0).replace(/[^\d.-]/g, '') || 0).toLocaleString()} ${devise}`

function safeDateTime(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function safeDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  window.URL.revokeObjectURL(url)
}

function normalizeStatut(s: any) {
  const v = String(s || '').trim().toLowerCase()
  if (v === 'confirmée') return 'confirmee'
  if (v === 'annulée') return 'annulee'
  return v
}

function normalizeTypeKey(t: any) {
  const raw = String(t || '').trim().toLowerCase()
  if (!raw) return 'billet_avion'
  const v = raw.replace(/['']/g, '').replace(/\s+/g, '_').replace(/-+/g, '_')
  if (v.includes('billet') && v.includes('avion')) return 'billet_avion'
  if (v.includes('evenement') || v.includes('event')) return 'evenement'
  if (v.includes('forfait') || v.includes('package')) return 'forfait'
  if (v.includes('hotel')) return 'hotel'
  if (v.includes('voiture') || v.includes('car')) return 'voiture'
  if (v.includes('assurance') || v.includes('insurance')) return 'assurance'
  if (v.includes('evisa') || v.includes('e_visa') || v.includes('visa')) return 'evisa'
  return v
}

function normalizeArray<T>(input: any): T[] {
  if (!input) return []
  if (Array.isArray(input)) return input as T[]
  if (Array.isArray(input?.data)) return input.data as T[]
  if (Array.isArray(input?.items)) return input.items as T[]
  return []
}

function buildName(obj: any) {
  if (!obj) return ''
  const n = [obj?.prenom, obj?.nom].filter(Boolean).join(' ').trim()
  if (n) return n
  if (obj?.name) return String(obj.name)
  if (obj?.full_name) return String(obj.full_name)
  return ''
}

function firstOf(...vals: any[]) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return null
}

/* ─── Extractors ───────────────────────────────────────────────────────────── */
function extractAssuranceDetails(r: any) {
  const a = r?.assurance_details ?? r?.assuranceDetails ?? r?.assurance_detail ?? null
  return {
    libelle: firstOf(a?.libelle, a?.label, r?.libelle),
    date_debut: firstOf(a?.date_debut, a?.start_date, r?.date_debut),
    date_fin: firstOf(a?.date_fin, a?.end_date, r?.date_fin),
  }
}

function extractEvisaDetails(r: any) {
  const e = r?.evisa_details ?? r?.evisaDetails ?? null
  return {
    pays_destination: firstOf(e?.pays_destination, r?.pays_destination),
    type_visa:        firstOf(e?.type_visa, r?.type_visa),
    date_voyage:      firstOf(e?.date_voyage, r?.date_voyage),
    duree_sejour:     firstOf(e?.duree_sejour, r?.duree_sejour),
  }
}

function extractPeriod(r: any) {
  const assurance = extractAssuranceDetails(r)
  return {
    start: firstOf(assurance?.date_debut, r?.date_debut, r?.start_date, r?.check_in, r?.date_depart, r?.debut),
    end: firstOf(assurance?.date_fin, r?.date_fin, r?.end_date, r?.check_out, r?.date_retour, r?.fin),
  }
}

function extractLocation(r: any) {
  const p = r?.produit
  return {
    city: firstOf(r?.ville, r?.city, p?.ville, p?.city, p?.lieu, r?.lieu),
    address: firstOf(p?.adresse, p?.address, r?.adresse, r?.address),
  }
}

function extractOptions(r: any) {
  return {
    nombre_personnes: firstOf(r?.nombre_personnes, r?.nb_personnes),
    nombre_nuits: firstOf(r?.nombre_nuits, r?.nb_nuits, r?.nights),
    nombre_jours: firstOf(r?.nombre_jours, r?.nb_jours, r?.days),
    chambre: firstOf(r?.chambre, r?.room_type, r?.type_chambre),
    pension: firstOf(r?.pension, r?.meal_plan),
    categorie: firstOf(r?.categorie, r?.category, r?.classement),
    kilometrage: firstOf(r?.kilometrage, r?.km),
  }
}

function pickBeneficiaries(r: any, client: any) {
  const direct = r?.beneficiaire ?? r?.beneficiary ?? r?.assurance_beneficiary ?? null
  if (direct && typeof direct === 'object') {
    const name = buildName(direct)
    if (name) return [{ ...direct, __name: name }]
  }
  const parts = normalizeArray<any>(r?.participants)
  const preferred = parts.filter((p) =>
    ['beneficiary', 'beneficiaire', 'assure', 'assured', 'passenger']
      .includes(String(p?.role || '').toLowerCase().trim())
  )
  const finalParts = preferred.length ? preferred : parts
  const withNames = finalParts
    .map((p) => { const name = buildName(p); return name ? { ...p, __name: name } : null })
    .filter(Boolean)
  if (withNames.length) return withNames as any[]
  const clientName = buildName(client)
  if (clientName) return [{ __name: clientName }]
  return []
}

/* ─── Invoice helpers ───────────────────────────────────────────────────────── */
function pickLatestInvoice(r: any) {
  if (!r) return null
  if (r.facture && typeof r.facture === 'object') return r.facture
  if (r.factures && typeof r.factures === 'object' && !Array.isArray(r.factures) && r.factures.id) return r.factures
  const fs = r.factures
  let arr: any[] = []
  if (Array.isArray(fs)) arr = fs
  else if (Array.isArray(fs?.data)) arr = fs.data
  else if (Array.isArray(fs?.items)) arr = fs.items
  if (!arr.length) return null
  return [...arr].sort((a, b) =>
    new Date(b?.created_at || b?.date_facture || 0).getTime() -
    new Date(a?.created_at || a?.date_facture || 0).getTime()
  )[0] ?? null
}

function computePay(r: any) {
  const f = pickLatestInvoice(r)
  const total = Number(f?.total ?? f?.total_ttc ?? f?.montant_total ?? f?.total_amount ?? r?.montant_total ?? 0) || 0
  const raw = f?.paiements ?? r?.paiements ?? []
  const paiements: any[] = Array.isArray(raw) ? raw
    : Array.isArray(raw?.data) ? raw.data
    : Array.isArray(raw?.items) ? raw.items : []
  const paid = paiements.reduce((sum, p) => {
    const st = normalizeStatut(p?.statut)
    const m = Number(p?.montant ?? 0) || 0
    if (!p?.statut || st === 'recu' || st === 'reçu') return sum + m
    return sum
  }, 0)
  const remaining = Math.max(0, total - paid)
  const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((paid / total) * 100))) : 0
  const label = paid <= 0 ? 'Non payé' : total > 0 && paid >= total ? 'Payé' : 'Partiel'
  const tone: 'gray' | 'amber' | 'green' = paid <= 0 ? 'gray' : total > 0 && paid >= total ? 'green' : 'amber'
  return { total, paid, remaining, percent, label, tone, facture: f, paiements }
}

/* ─── Type metadata ─────────────────────────────────────────────────────────── */
const TYPE_META: Record<string, {
  label: string; icon: React.ReactNode; iconLg: React.ReactNode
  accent: string; accentDark: string; badge: string; badgeDark: string
  bar: string; ring: string
}> = {
  billet_avion: {
    label: "Billet d'avion",
    icon: <Plane size={16} />, iconLg: <Plane size={24} />,
    accent: 'bg-sky-100 text-sky-700', accentDark: 'dark:bg-sky-500/15 dark:text-sky-300',
    badge: 'bg-sky-100 text-sky-700 border-sky-200', badgeDark: 'dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/25',
    bar: 'from-sky-500 to-blue-600', ring: 'ring-sky-200 dark:ring-sky-500/30',
  },
  hotel: {
    label: 'Hôtel',
    icon: <Hotel size={16} />, iconLg: <Hotel size={24} />,
    accent: 'bg-emerald-100 text-emerald-700', accentDark: 'dark:bg-emerald-500/15 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', badgeDark: 'dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25',
    bar: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-200 dark:ring-emerald-500/30',
  },
  voiture: {
    label: 'Voiture',
    icon: <Car size={16} />, iconLg: <Car size={24} />,
    accent: 'bg-amber-100 text-amber-700', accentDark: 'dark:bg-amber-500/15 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-700 border-amber-200', badgeDark: 'dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25',
    bar: 'from-amber-500 to-orange-600', ring: 'ring-amber-200 dark:ring-amber-500/30',
  },
  evenement: {
    label: 'Événement',
    icon: <PartyPopper size={16} />, iconLg: <PartyPopper size={24} />,
    accent: 'bg-violet-100 text-violet-700', accentDark: 'dark:bg-violet-500/15 dark:text-violet-300',
    badge: 'bg-violet-100 text-violet-700 border-violet-200', badgeDark: 'dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25',
    bar: 'from-violet-500 to-purple-600', ring: 'ring-violet-200 dark:ring-violet-500/30',
  },
  forfait: {
    label: 'Forfait',
    icon: <Package size={16} />, iconLg: <Package size={24} />,
    accent: 'bg-indigo-100 text-indigo-700', accentDark: 'dark:bg-indigo-500/15 dark:text-indigo-300',
    badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', badgeDark: 'dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/25',
    bar: 'from-indigo-500 to-blue-600', ring: 'ring-indigo-200 dark:ring-indigo-500/30',
  },
  assurance: {
    label: 'Assurance',
    icon: <Shield size={16} />, iconLg: <Shield size={24} />,
    accent: 'bg-rose-100 text-rose-700', accentDark: 'dark:bg-rose-500/15 dark:text-rose-300',
    badge: 'bg-rose-100 text-rose-700 border-rose-200', badgeDark: 'dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/25',
    bar: 'from-rose-500 to-pink-600', ring: 'ring-rose-200 dark:ring-rose-500/30',
  },
  evisa: {
    label: 'E-Visa / Assistance visa',
    icon: <Stamp size={16} />, iconLg: <Stamp size={24} />,
    accent: 'bg-teal-100 text-teal-700', accentDark: 'dark:bg-teal-500/15 dark:text-teal-300',
    badge: 'bg-teal-100 text-teal-700 border-teal-200', badgeDark: 'dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/25',
    bar: 'from-teal-500 to-cyan-600', ring: 'ring-teal-200 dark:ring-teal-500/30',
  },
}

const DEFAULT_META = {
  label: 'Réservation', icon: <ClipboardList size={16} />, iconLg: <ClipboardList size={24} />,
  accent: 'bg-gray-100 text-gray-700', accentDark: 'dark:bg-white/10 dark:text-gray-300',
  badge: 'bg-gray-100 text-gray-700 border-gray-200', badgeDark: 'dark:bg-white/10 dark:text-gray-300 dark:border-white/15',
  bar: 'from-gray-400 to-gray-600', ring: 'ring-gray-200 dark:ring-white/15',
}

/* ─── UI primitives ─────────────────────────────────────────────────────────── */
function StatutBadge({ statut }: { statut: any }) {
  const v = normalizeStatut(statut)
  if (v === 'confirmee') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25">
      <CheckCircle2 size={11} /> Confirmée
    </span>
  )
  if (v === 'annulee') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300 border border-red-200 dark:border-red-500/25">
      <XCircle size={11} /> Annulée
    </span>
  )
  if (v === 'brouillon') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/15">
      <ClipboardList size={11} /> Brouillon
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-500/25">
      <Clock size={11} /> En attente
    </span>
  )
}

function Card({ title, icon, right, children, className }: {
  title?: string; icon?: React.ReactNode; right?: React.ReactNode
  children: React.ReactNode; className?: string
}) {
  return (
    <div className={cx('rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft overflow-hidden', className)}>
      {title && (
        <div className="px-5 py-3.5 border-b border-black/[0.05] dark:border-white/[0.07] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{title}</span>
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

function Field({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className="mt-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100 break-words leading-snug">
        {value ?? '—'}
      </div>
    </div>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-black/[0.04] dark:border-white/[0.05] last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right max-w-[60%] break-words">{value ?? '—'}</span>
    </div>
  )
}

function Chip({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'blue' | 'green' | 'amber' | 'red' }) {
  const cls = {
    gray:  'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/15',
    blue:  'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/25',
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25',
    amber: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25',
    red:   'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25',
  }[tone]
  return <span className={cx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border', cls)}>{children}</span>
}

function PayModeIcon({ mode }: { mode: string }) {
  const m = String(mode || '').toLowerCase()
  if (m === 'especes' || m === 'espèces') return <Banknote size={14} />
  if (m === 'wave' || m === 'orange_money' || m === 'mobile') return <Smartphone size={14} />
  if (m === 'virement') return <Building size={14} />
  if (m === 'carte') return <CreditCard size={14} />
  if (m === 'cheque' || m === 'chèque') return <LandmarkIcon size={14} />
  return <CreditCard size={14} />
}

function PersonCard({ name, details, index, accentClass, chip }: {
  name: string; details?: string; index: number; accentClass: string; chip?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] px-4 py-3">
      <div className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', accentClass)}>
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{name}</div>
        {details && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{details}</div>}
      </div>
      {chip}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page principale
═══════════════════════════════════════════════════════════════════════════ */
export default function ReservationDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const { collapsed } = useSidebar()

  const qc = useQueryClient()

  /* ── detail-level state ── */
  const [busy, setBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [busyInvoiceId, setBusyInvoiceId] = useState<number | null>(null)
  const [payFormOpen, setPayFormOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ montant: 0, mode_paiement: 'especes', reference: '' })
  const [penaltyOpen, setPenaltyOpen] = useState(false)
  const [waOpen, setWaOpen] = useState(false)

  /* ── Fetch ── */
  const q = useQuery({
    queryKey: ['reservation', Number(id)],
    queryFn: async () => {
      const { data } = await api.get(`/reservations/${id}`)
      return data?.data ?? data
    },
    enabled: !!id,
    staleTime: 10_000,
  })

  const r = q.data ?? null

  /* ── Derived data ── */
  const typeKey  = normalizeTypeKey(r?.type)
  const typeMeta = TYPE_META[typeKey] ?? DEFAULT_META
  const client   = r?.client ?? null
  const devise   = String(r?.devise || 'XOF')
  const pay      = useMemo(() => computePay(r), [r])
  const flight   = r?.flight_details ?? r?.flightDetails ?? null

  const passengerIsClient =
    typeof r?.passenger_is_client === 'boolean' ? r.passenger_is_client
    : typeof r?.passenger_is_client === 'number' ? !!r.passenger_is_client : false

  const passengers = useMemo(() => {
    const arr = r?.passengers ?? r?.passager ?? r?.beneficiaires ?? r?.participants ?? []
    return Array.isArray(arr) ? arr.filter((p: any) => p && (p.nom || p.prenom)) : []
  }, [r?.passengers, r?.participants])

  const passengerName = useMemo(() => {
    if (typeKey !== 'billet_avion') return null
    if (passengers.length === 1) return buildName(passengers[0])
    if (passengers.length > 1) return `${passengers.length} passagers`
    if (passengerIsClient) return buildName(client)
    return null
  }, [typeKey, passengers, passengerIsClient, client])

  const participants     = useMemo(() => normalizeArray<any>(r?.participants), [r?.participants])
  const showParticipants = typeKey === 'evenement' || typeKey === 'forfait' || typeKey === 'assurance'
  const period           = useMemo(() => extractPeriod(r), [r])
  const loc              = useMemo(() => extractLocation(r), [r])
  const opts             = useMemo(() => extractOptions(r), [r])
  const assurance        = useMemo(() => extractAssuranceDetails(r), [r])
  const assuranceBenefs  = useMemo(() => pickBeneficiaries(r, client), [r, client])
  const evisa            = useMemo(() => extractEvisaDetails(r), [r])
  const ref        = r?.reference ?? `#${id ?? '—'}`
  const clientName = buildName(client) || client?.nom || '—'
  const evisaDemandeurs  = useMemo(() => {
    const parts = normalizeArray<any>(r?.participants)
    const demandeurs = parts.filter((p) =>
      ['demandeur', 'passenger', 'beneficiary'].includes(String(p?.role || '').toLowerCase())
    )
    const list = demandeurs.length ? demandeurs : parts
    const withNames = list.map((p) => {
      const name = buildName(p)
      return name ? { ...p, __name: name } : null
    }).filter(Boolean) as any[]
    if (withNames.length) return withNames
    return [{ __name: buildName(client) || clientName }]
  }, [r, client, clientName])

  /* ── Mutation édition ── */
  const mUpdate = useMutation({
    mutationFn: async (vals: ReservationInput) => {
      const { acompte, ...payload } = vals as any
      const res = await api.put(`/reservations/${id}`, payload)
      return { reservation: res.data?.data ?? res.data, acompte }
    },
    onSuccess: async ({ reservation: updated, acompte }) => {
      try {
        const montant = Number(acompte?.montant || 0)
        if (montant > 0 && updated?.id) {
          await api.post(`/reservations/${updated.id}/encaisser`, {
            montant,
            mode_paiement: acompte.mode_paiement || 'especes',
            reference: acompte.reference || null,
            date_paiement: new Date().toISOString().slice(0, 10),
          })
        }
      } catch { /* acompte optionnel */ }
      qc.invalidateQueries({ queryKey: ['reservation', Number(id)] })
      qc.invalidateQueries({ queryKey: ['reservations'] })
      toast.push({ title: 'Réservation mise à jour ✓', tone: 'success' })
      setEditOpen(false)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la mise à jour.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  /* ── API helpers ── */
  const refreshReservation = async () => {
    setBusy(true)
    try { await q.refetch() } finally { setBusy(false) }
  }

  const downloadDevisPdf = async () => {
    if (!r?.id) return
    try {
      const res = await api.get(`/reservations/${r.id}/devis-pdf`, { responseType: 'blob' })
      downloadBlob(res.data, `devis-${r?.reference || r.id}.pdf`.replace(/[^\w\-\.]+/g, '_'))
      toast.push({ title: 'Devis téléchargé', tone: 'success' })
    } catch (err: any) {
      toast.push({ title: err?.response?.data?.message || 'Impossible de générer le devis.', tone: 'error' })
    }
  }

  const downloadFacturePdf = async (factureId: number, numero?: string) => {
    try {
      const res = await api.get(`/factures/${factureId}/pdf`, { responseType: 'blob' })
      downloadBlob(res.data, `${numero || `facture-${factureId}`}.pdf`.replace(/[^\w\-\.]+/g, '_'))
      toast.push({ title: 'Facture téléchargée', tone: 'success' })
    } catch (err: any) {
      toast.push({ title: err?.response?.data?.message || 'PDF indisponible.', tone: 'error' })
    }
  }

  const ensureInvoice = async (): Promise<any | null> => {
    if (!r?.id) return null
    let facture = pickLatestInvoice(r)
    if (facture?.id) return facture
    const created = await api.post(`/reservations/${r.id}/factures`, { date_facture: new Date().toISOString().slice(0, 10) })
    facture = created?.data?.data ?? created?.data
    return facture?.id ? facture : null
  }

  const ensureAndDownloadInvoice = async () => {
    if (!r?.id) return
    setBusyInvoiceId(r.id)
    try {
      const facture = await ensureInvoice()
      if (!facture?.id) { toast.push({ title: 'Aucune facture trouvée/créée.', tone: 'error' }); return }
      await downloadFacturePdf(Number(facture.id), facture?.numero)
      await refreshReservation()
    } catch (err: any) {
      toast.push({ title: err?.response?.data?.message || 'Impossible de télécharger la facture.', tone: 'error' })
    } finally { setBusyInvoiceId(null) }
  }

  const emitInvoice = async () => {
    setBusy(true)
    try {
      const facture = await ensureInvoice()
      if (!facture?.id) { toast.push({ title: 'Impossible de créer la facture.', tone: 'error' }); return }
      await api.post(`/factures/${facture.id}/emettre`)
      toast.push({ title: 'Facture émise', tone: 'success' })
      await refreshReservation()
    } catch (err: any) {
      toast.push({ title: err?.response?.data?.message || "Impossible d'émettre la facture.", tone: 'error' })
    } finally { setBusy(false) }
  }

  const addPayment = async () => {
    const montant = Number(paymentForm.montant || 0)
    if (montant <= 0) { toast.push({ title: 'Montant du paiement requis.', tone: 'error' }); return }
    setBusy(true)
    try {
      // ✅ Un seul appel atomique : crée/émet la facture si besoin + enregistre le paiement
      await api.post(`/reservations/${r.id}/encaisser`, {
        montant,
        mode_paiement: paymentForm.mode_paiement,
        reference: paymentForm.reference || null,
        date_paiement: new Date().toISOString().slice(0, 10),
      })
      toast.push({ title: 'Paiement enregistré ✓', tone: 'success' })
      setPaymentForm({ montant: 0, mode_paiement: 'especes', reference: '' })
      setPayFormOpen(false)
      await refreshReservation()
    } catch (err: any) {
      toast.push({ title: err?.response?.data?.message || "Impossible d'enregistrer le paiement.", tone: 'error' })
    } finally { setBusy(false) }
  }

  /* ═══ RENDER ════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/reservations"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-3 group"
          >
            <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Retour aux réservations
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
              <Calendar size={18} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{ref}</h1>
                {r && <StatutBadge statut={r.statut} />}
              </div>
              {clientName && clientName !== '—' && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{clientName}</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-start sm:pt-10">
          {r && r.statut !== 'annulee' && r.statut !== 'annulée' && (
            <button
              type="button"
              onClick={() => setPenaltyOpen(true)}
              className="btn bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30 dark:hover:bg-amber-500/20 inline-flex items-center gap-1.5 shadow-sm"
              title="Appliquer une pénalité (modification, no-show, annulation…)"
            >
              <AlertTriangle size={14} />
              Pénalité
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            disabled={!r || mUpdate.isPending}
            className="btn bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <Pencil size={14} />
            Modifier
          </button>
        </div>
      </div>

      {/* ── Loading / Error ───────────────────────────────────────────────────── */}
      {q.isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
          <Loader2 size={32} className="animate-spin" />
          <span className="text-sm">Chargement de la réservation…</span>
        </div>
      ) : q.isError ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-8 text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400">
              <AlertCircle size={24} />
            </div>
          </div>
          <div className="text-red-700 dark:text-red-300 font-semibold text-base mb-1">Réservation introuvable</div>
          <div className="text-sm text-red-500/80 dark:text-red-300/70 mb-5">
            Cette réservation n'existe pas ou a été supprimée.
          </div>
          <Link to="/reservations"
            className="inline-flex items-center gap-2 btn bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
          >
            <ChevronLeft size={14} /> Retour aux réservations
          </Link>
        </div>
      ) : r ? (

        /* ══ Détail complet ══════════════════════════════════════════════════════ */
        <div className="space-y-5">

          {/* ── Hero ──────────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft overflow-hidden">
            <div className={cx('h-[3px] bg-gradient-to-r', typeMeta.bar)} />

            <div className="p-4">
              {/* Row : icon + identity + total */}
              <div className="flex flex-col sm:flex-row gap-5 sm:items-start">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={cx(
                    'flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl ring-1',
                    typeMeta.accent, typeMeta.accentDark, typeMeta.ring,
                  )}>
                    {typeMeta.iconLg}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">{ref}</h2>
                      <StatutBadge statut={r?.statut} />
                      <span className={cx(
                        'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                        typeMeta.badge, typeMeta.badgeDark,
                      )}>
                        {typeMeta.icon}&nbsp;{typeMeta.label}
                      </span>
                    </div>
                    <div className="text-base font-semibold text-gray-800 dark:text-gray-100">{clientName}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400 dark:text-gray-500">
                      {typeKey === 'billet_avion' && passengerName && (
                        <span className="flex items-center gap-1"><User size={11} />{passengerName}</span>
                      )}
                      <span className="font-mono">#{r?.id}</span>
                      <span>{safeDateTime(r?.created_at)}</span>
                      {busy && (
                        <span className="flex items-center gap-1 text-sky-500">
                          <RefreshCw size={10} className="animate-spin" /> Actualisation…
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
                  <div>
                    <div className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-none">
                      {money(pay.total || r?.montant_total, devise)}
                    </div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-1">Total réservation</div>
                  </div>
                  <Chip tone={pay.tone === 'green' ? 'green' : pay.tone === 'amber' ? 'amber' : 'gray'}>
                    <TrendingUp size={11} />
                    {pay.label}{pay.total > 0 ? ` — ${pay.percent}%` : ''}
                  </Chip>
                </div>
              </div>

              {/* Payment progress */}
              {pay.total > 0 && (
                <div className="mt-5 pt-4 border-t border-black/[0.05] dark:border-white/[0.07]">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      Payé :&nbsp;<strong className="text-emerald-600 dark:text-emerald-400">{money(pay.paid, devise)}</strong>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      Reste :&nbsp;<strong className={pay.remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}>
                        {money(pay.remaining, devise)}
                      </strong>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className={cx(
                        'h-full rounded-full transition-all duration-700 ease-out',
                        pay.tone === 'green'  ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                        pay.tone === 'amber'  ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                        'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-white/20 dark:to-white/30'
                      )}
                      style={{ width: `${pay.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action bar */}
              <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.07] flex flex-wrap items-center gap-2">
                <button type="button" onClick={refreshReservation} disabled={busy}
                  className="btn bg-gray-100 dark:bg-white/[0.07] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 border border-black/[0.06] dark:border-white/[0.09] inline-flex items-center gap-1.5">
                  <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Rafraîchir
                </button>
                <button type="button" onClick={downloadDevisPdf} disabled={busy}
                  className="btn bg-gray-100 dark:bg-white/[0.07] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 border border-black/[0.06] dark:border-white/[0.09] inline-flex items-center gap-1.5">
                  <FileText size={14} /> Devis PDF
                </button>
                <button type="button" onClick={ensureAndDownloadInvoice} disabled={!!busyInvoiceId || busy}
                  className="btn bg-gray-100 dark:bg-white/[0.07] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 border border-black/[0.06] dark:border-white/[0.09] inline-flex items-center gap-1.5">
                  <Download size={14} /> Facture PDF
                </button>

                <div className="hidden sm:block h-5 w-px bg-black/[0.08] dark:bg-white/[0.1] mx-0.5" />

                <Link
                  to={`/factures?reservation_id=${r?.id}&ref=${encodeURIComponent(r?.reference ?? r?.id ?? '')}`}
                  className="btn bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 border border-sky-200 dark:border-sky-500/25 hover:bg-sky-100 dark:hover:bg-sky-500/20 inline-flex items-center gap-1.5"
                >
                  <Receipt size={14} /> Factures
                </Link>
                <Link
                  to={(() => {
                    const f = pickLatestInvoice(r)
                    if (f?.id) return `/paiements?facture_id=${f.id}&facture_num=${encodeURIComponent(f.numero ?? f.id)}`
                    return '/paiements'
                  })()}
                  className="btn bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 border border-sky-200 dark:border-sky-500/25 hover:bg-sky-100 dark:hover:bg-sky-500/20 inline-flex items-center gap-1.5"
                >
                  <CreditCard size={14} /> Paiements
                </Link>
                {client?.id && (
                  <Link to={`/reservations?client_id=${client.id}`}
                    className="btn bg-gray-100 dark:bg-white/[0.07] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 border border-black/[0.06] dark:border-white/[0.09] inline-flex items-center gap-1.5"
                  >
                    <Users size={14} /> Autres réservations
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ══ Main grid ═══════════════════════════════════════════════════════ */}
          <div className={cx(
            'grid grid-cols-1 gap-5 items-start',
            collapsed ? 'lg:grid-cols-[3fr_2fr]' : 'xl:grid-cols-[3fr_2fr]',
          )}>

            {/* ── LEFT column ─────────────────────────────────────────────────── */}
            <div className="space-y-3 min-w-0">

              {/* Client */}
              <Card title="Client" icon={<User size={15} />} right={client?.id ? <Chip tone="gray">#{client.id}</Chip> : undefined}>
                {client ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Nom complet" value={clientName} icon={<User size={12} />} />
                    <Field label="Téléphone"
                      value={client?.telephone ? <a href={`tel:${client.telephone}`} className="hover:underline">{client.telephone}</a> : '—'}
                      icon={<Phone size={12} />}
                    />
                    <Field label="Email"
                      value={client?.email ? <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a> : '—'}
                      icon={<Mail size={12} />}
                    />
                    <Field label="Pays" value={client?.pays || '—'} icon={<Globe size={12} />} />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucune information client.</p>
                )}
              </Card>

              {/* Vol timeline */}
              {typeKey === 'billet_avion' && (
                <Card title="Détails du vol" icon={<Plane size={15} />}
                  right={flight?.pnr
                    ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 border border-sky-200 dark:border-sky-500/25 font-mono tracking-wider">
                        PNR&nbsp;{String(flight.pnr).toUpperCase()}
                      </span>
                    : undefined}
                >
                  <div className="flex items-center gap-3 py-3 px-2 mb-5 rounded-xl bg-sky-50 dark:bg-sky-500/[0.06] border border-sky-100 dark:border-sky-500/20">
                    <div className="flex-1 min-w-0 text-center">
                      <div className="text-xl font-black text-gray-900 dark:text-white truncate uppercase tracking-wide leading-none">
                        {flight?.ville_depart || '—'}
                      </div>
                      <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{safeDate(flight?.date_depart)}</div>
                    </div>
                    <div className="flex flex-col items-center shrink-0">
                      <div className="flex items-center gap-1.5 text-gray-300 dark:text-gray-600">
                        <div className="h-px w-6 bg-current" />
                        <div className={cx('flex h-8 w-8 items-center justify-center rounded-full', typeMeta.accent, typeMeta.accentDark)}>
                          <Plane size={14} />
                        </div>
                        <div className="h-px w-6 bg-current" />
                      </div>
                      {flight?.compagnie && (
                        <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">{flight.compagnie}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-center">
                      <div className="text-xl font-black text-gray-900 dark:text-white truncate uppercase tracking-wide leading-none">
                        {flight?.ville_arrivee || '—'}
                      </div>
                      <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{safeDate(flight?.date_arrivee)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="Compagnie" value={flight?.compagnie || '—'} icon={<Plane size={12} />} />
                    <Field label="Classe" value={flight?.classe || '—'} icon={<Ticket size={12} />} />
                    <Field label="Départ" value={safeDate(flight?.date_depart)} icon={<Calendar size={12} />} />
                    <Field label="Arrivée" value={safeDate(flight?.date_arrivee)} icon={<Calendar size={12} />} />
                  </div>
                </Card>
              )}

              {/* Passagers */}
              {typeKey === 'billet_avion' && (() => {
                const list = passengers.length > 0 ? passengers : passengerIsClient ? [client] : []
                return (
                  <Card title="Passagers" icon={<Users size={15} />}
                    right={<Chip tone="blue">{list.length} passager{list.length !== 1 ? 's' : ''}</Chip>}>
                    {list.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucun passager enregistré.</p>
                    ) : (
                      <div className="space-y-2">
                        {list.map((p: any, idx: number) => {
                          const name = [p?.prenom, p?.nom].filter(Boolean).join(' ') || p?.nom || `Passager ${idx + 1}`
                          const details = [p?.passport && `Passeport: ${p.passport}`, p?.sexe && `Sexe: ${p.sexe}`].filter(Boolean).join(' · ')
                          return (
                            <PersonCard key={idx} name={name} details={details || undefined} index={idx}
                              accentClass="bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300"
                              chip={passengerIsClient && idx === 0 ? <Chip tone="gray">Client</Chip> : undefined}
                            />
                          )
                        })}
                      </div>
                    )}
                  </Card>
                )
              })()}

              {/* Assurance details */}
              {typeKey === 'assurance' && (assurance?.libelle || assurance?.date_debut || assurance?.date_fin) && (
                <Card title="Détails assurance" icon={<Shield size={15} />}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Libellé" value={assurance?.libelle || '—'} icon={<Tag size={12} />} />
                    <Field label="Début" value={safeDate(assurance?.date_debut)} icon={<Calendar size={12} />} />
                    <Field label="Fin" value={safeDate(assurance?.date_fin)} icon={<Calendar size={12} />} />
                  </div>
                </Card>
              )}

              {/* Bénéficiaires assurance */}
              {typeKey === 'assurance' && (
                <Card title="Bénéficiaires" icon={<Users size={15} />} right={<Chip tone="gray">{assuranceBenefs.length}</Chip>}>
                  {assuranceBenefs.length === 0 ? (
                    <div className="text-sm text-gray-500">Fallback client : <span className="font-medium">{clientName}</span></div>
                  ) : (
                    <div className="space-y-2">
                      {assuranceBenefs.map((b: any, idx: number) => {
                        const name = b?.__name || b?.nom || `Bénéficiaire ${idx + 1}`
                        const details = [b?.passport && `Passeport: ${b.passport}`, b?.sexe && `Sexe: ${b.sexe}`, b?.age != null && `Âge: ${b.age}`].filter(Boolean).join(' · ')
                        return (
                          <PersonCard key={b?.id ?? idx} name={name} details={details || undefined} index={idx}
                            accentClass="bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            chip={b?.role ? <Chip tone="gray">{b.role}</Chip> : undefined}
                          />
                        )
                      })}
                    </div>
                  )}
                </Card>
              )}

              {/* E-Visa details */}
              {typeKey === 'evisa' && (evisa.pays_destination || evisa.type_visa || evisa.date_voyage || evisa.duree_sejour) && (
                <Card title="Détails e-visa" icon={<Stamp size={15} />}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {evisa.pays_destination && (
                      <Field label="Pays de destination" value={evisa.pays_destination} icon={<Globe size={12} />} />
                    )}
                    {evisa.type_visa && (
                      <Field label="Type de visa" value={evisa.type_visa} icon={<Stamp size={12} />} />
                    )}
                    {evisa.date_voyage && (
                      <Field label="Date de voyage" value={safeDate(evisa.date_voyage)} icon={<Calendar size={12} />} />
                    )}
                    {evisa.duree_sejour && (
                      <Field label="Durée de séjour" value={String(evisa.duree_sejour)} icon={<Clock size={12} />} />
                    )}
                  </div>
                </Card>
              )}

              {/* Demandeurs e-visa */}
              {typeKey === 'evisa' && (
                <Card title="Demandeurs" icon={<Users size={15} />}
                  right={<Chip tone="blue">{evisaDemandeurs.length} demandeur{evisaDemandeurs.length !== 1 ? 's' : ''}</Chip>}>
                  {evisaDemandeurs.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun demandeur enregistré.</p>
                  ) : (
                    <div className="space-y-2">
                      {evisaDemandeurs.map((d: any, idx: number) => {
                        const name = d?.__name || d?.nom || `Demandeur ${idx + 1}`
                        const details = [
                          d?.passport && `Passeport: ${d.passport}`,
                          d?.sexe && `Sexe: ${d.sexe}`,
                          d?.age != null && `Âge: ${d.age}`,
                        ].filter(Boolean).join(' · ')
                        return (
                          <PersonCard key={d?.id ?? idx} name={name} details={details || undefined} index={idx}
                            accentClass="bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300"
                            chip={d?.role ? <Chip tone="gray">{d.role}</Chip> : undefined}
                          />
                        )
                      })}
                    </div>
                  )}
                </Card>
              )}

              {/* Produit */}
              {r?.produit && (
                <Card title="Produit / Service" icon={<Building2 size={15} />} right={r.produit?.id ? <Chip tone="gray">#{r.produit.id}</Chip> : undefined}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Nom" value={r.produit?.nom || '—'} icon={<Building2 size={12} />} />
                    <Field label="Type" value={r.produit?.type_label ?? r.produit?.type ?? '—'} icon={<Tag size={12} />} />
                    {loc?.city && <Field label="Lieu" value={loc.city} icon={<MapPin size={12} />} />}
                    {loc?.address && <Field label="Adresse" value={loc.address} icon={<MapPin size={12} />} />}
                  </div>
                </Card>
              )}

              {/* Forfait */}
              {r?.forfait && (
                <Card title="Forfait" icon={<Package size={15} />} right={r.forfait?.id ? <Chip tone="gray">#{r.forfait.id}</Chip> : undefined}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Nom" value={r.forfait?.nom || '—'} icon={<Package size={12} />} />
                    <Field label="Type" value={r.forfait?.type ?? '—'} icon={<Tag size={12} />} />
                    {r.forfait?.prix != null && <Field label="Prix" value={money(r.forfait.prix, devise)} icon={<Receipt size={12} />} />}
                    {r.forfait?.nombre_max_personnes != null && <Field label="Max personnes" value={String(r.forfait.nombre_max_personnes)} icon={<Users size={12} />} />}
                  </div>
                </Card>
              )}

              {/* Période */}
              {(period.start || period.end) && (
                <Card
                  title={typeKey === 'hotel' ? 'Séjour' : typeKey === 'voiture' ? 'Location' : typeKey === 'evenement' ? 'Dates' : 'Période'}
                  icon={<Calendar size={15} />}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.07] px-4 py-3 text-center">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Début</div>
                      <div className="mt-1.5 text-sm font-bold text-gray-900 dark:text-gray-100">{safeDate(period.start)}</div>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-gray-300 dark:text-gray-600" />
                    <div className="flex-1 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.07] px-4 py-3 text-center">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Fin</div>
                      <div className="mt-1.5 text-sm font-bold text-gray-900 dark:text-gray-100">{safeDate(period.end)}</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Options */}
              {(() => {
                const rows = [
                  { label: 'Nbre personnes', value: opts.nombre_personnes, icon: <Users size={12} /> },
                  { label: 'Nuits',           value: opts.nombre_nuits,    icon: <Clock size={12} /> },
                  { label: 'Jours',           value: opts.nombre_jours,    icon: <Clock size={12} /> },
                  { label: 'Chambre',         value: opts.chambre,         icon: <Hotel size={12} /> },
                  { label: 'Pension',         value: opts.pension,         icon: <Hotel size={12} /> },
                  { label: 'Catégorie',       value: opts.categorie,       icon: <Tag size={12} /> },
                  { label: 'Kilométrage',     value: opts.kilometrage,     icon: <Route size={12} /> },
                ].filter((x) => x.value !== null && x.value !== undefined && String(x.value).trim() !== '')
                if (!rows.length) return null
                return (
                  <Card
                    title={typeKey === 'hotel' ? 'Options hôtel' : typeKey === 'voiture' ? 'Options véhicule' : 'Options'}
                    icon={<Zap size={15} />}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {rows.map((row) => <Field key={row.label} label={row.label} value={String(row.value)} icon={row.icon} />)}
                    </div>
                  </Card>
                )
              })()}

              {/* Participants */}
              {showParticipants && typeKey !== 'assurance' && (
                <Card title="Participants" icon={<Users size={15} />} right={<Chip tone="gray">{participants.length}</Chip>}>
                  {participants.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun participant enregistré.</p>
                  ) : (
                    <div className="space-y-2">
                      {participants.map((p: any, idx: number) => {
                        const name = [p?.prenom, p?.nom].filter(Boolean).join(' ') || p?.nom || `Participant ${idx + 1}`
                        const details = [p?.passport && `Passeport: ${p.passport}`, p?.sexe && `Sexe: ${p.sexe}`, p?.age != null && `Âge: ${p.age}`].filter(Boolean).join(' · ')
                        return (
                          <PersonCard key={p?.id ?? idx} name={name} details={details || undefined} index={idx}
                            accentClass="bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                            chip={p?.role ? <Chip tone="gray">{p.role}</Chip> : undefined}
                          />
                        )
                      })}
                    </div>
                  )}
                </Card>
              )}

              {/* Notes */}
              {r?.notes && (
                <Card title="Notes internes" icon={<Info size={15} />}>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{r.notes}</p>
                </Card>
              )}
            </div>

            {/* ── RIGHT column ────────────────────────────────────────────────── */}
            <div className="space-y-3 min-w-0">

              {/* Financial summary */}
              <Card title="Résumé financier"
                icon={pay.percent >= 100 ? <BadgeCheck size={15} /> : <BadgeAlert size={15} />}>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.07] p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total</div>
                      <div className="mt-1 text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">
                        {money(pay.total || r?.montant_total, devise)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Payé</div>
                      <div className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300 leading-tight">
                        {money(pay.paid, devise)}
                      </div>
                    </div>
                  </div>
                  <div className={cx(
                    'rounded-xl border p-3',
                    pay.remaining > 0
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20'
                      : 'bg-gray-50 dark:bg-white/[0.04] border-black/[0.05] dark:border-white/[0.07]'
                  )}>
                    <div className={cx('text-[10px] font-semibold uppercase tracking-wider',
                      pay.remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400')}>
                      Reste à payer
                    </div>
                    <div className={cx('mt-1 text-lg font-extrabold leading-tight',
                      pay.remaining > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-400 dark:text-gray-600')}>
                      {money(pay.remaining, devise)}
                    </div>
                  </div>

                  {(typeKey === 'billet_avion' || typeKey === 'assurance' || typeKey === 'evisa') &&
                   (r?.montant_sous_total != null || r?.montant_taxes != null) && (
                    <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.07] space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                          {typeKey === 'evisa' ? 'Frais de visa' : 'Montant achat'}
                        </span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{money(r?.montant_sous_total, devise)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Fees / commission</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{money(r?.montant_taxes, devise)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Quick actions */}
              <Card title="Actions rapides" icon={<Zap size={15} />}>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button type="button" onClick={emitInvoice} disabled={busy}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-black/[0.06] dark:border-white/[0.09] bg-gray-50 dark:bg-white/[0.04] px-3 py-4 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/[0.08] hover:border-emerald-200 dark:hover:border-emerald-500/25 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all duration-150">
                    <Receipt size={20} className="text-gray-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors" />
                    Émettre facture
                  </button>
                  <button type="button" onClick={() => setPayFormOpen((v) => !v)} disabled={busy}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-black/[0.06] dark:border-white/[0.09] bg-gray-50 dark:bg-white/[0.04] px-3 py-4 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-sky-50 dark:hover:bg-sky-500/[0.08] hover:border-sky-200 dark:hover:border-sky-500/25 hover:text-sky-700 dark:hover:text-sky-300 transition-all duration-150">
                    <CreditCard size={20} className="text-gray-400 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors" />
                    Ajouter paiement
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaOpen(true)}
                    disabled={!client?.telephone}
                    title={!client?.telephone ? "Aucun numéro de téléphone pour ce client" : "Envoyer un message WhatsApp au client"}
                    className="group col-span-2 flex items-center justify-center gap-2 rounded-xl border border-black/[0.06] dark:border-white/[0.09] bg-gray-50 dark:bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/[0.08] hover:border-emerald-200 dark:hover:border-emerald-500/25 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" className="text-emerald-500 dark:text-emerald-400 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/></svg>
                    Envoyer WhatsApp
                  </button>
                </div>

                {payFormOpen && (
                  <div className="rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-500/[0.06] p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <CreditCard size={14} className="text-sky-500" />
                        Nouveau paiement
                      </div>
                      <button type="button" onClick={() => setPayFormOpen(false)}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                        <XCircle size={15} />
                      </button>
                    </div>

                    {/* Montant + bouton Reste */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="label !mb-0">Montant *</label>
                        {pay.remaining > 0 && (
                          <button
                            type="button"
                            onClick={() => setPaymentForm((s) => ({ ...s, montant: Math.round(pay.remaining) }))}
                            className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                            title="Remplir avec le montant restant"
                          >
                            Reste : {money(pay.remaining, devise)} →
                          </button>
                        )}
                      </div>
                      <input
                        className="input font-semibold"
                        inputMode="numeric"
                        type="text"
                        placeholder="0"
                        value={paymentForm.montant === 0 ? '' : String(paymentForm.montant)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')
                          setPaymentForm((s) => ({ ...s, montant: digits === '' ? 0 : Number(digits) }))
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label">Mode</label>
                        <select className="input" value={paymentForm.mode_paiement}
                          onChange={(e) => setPaymentForm((s) => ({ ...s, mode_paiement: e.target.value }))}>
                          <option value="especes">Espèces</option>
                          <option value="wave">Wave</option>
                          <option value="orange_money">Orange Money</option>
                          <option value="free_money">Free Money</option>
                          <option value="virement">Virement</option>
                          <option value="carte">Carte bancaire</option>
                          <option value="cheque">Chèque</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Référence</label>
                        <input className="input" placeholder="Optionnel" value={paymentForm.reference}
                          onChange={(e) => setPaymentForm((s) => ({ ...s, reference: e.target.value }))} />
                      </div>
                    </div>

                    {/* Summary avant validation */}
                    {paymentForm.montant > 0 && pay.total > 0 && (
                      <div className="rounded-lg bg-white dark:bg-panel border border-black/[0.06] dark:border-white/[0.09] px-3 py-2 text-xs flex items-center justify-between">
                        <span className="text-gray-500">Après ce paiement :</span>
                        <span className={cx(
                          'font-semibold',
                          pay.paid + paymentForm.montant >= pay.total
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        )}>
                          {pay.paid + paymentForm.montant >= pay.total
                            ? '✓ Soldé'
                            : `Reste ${money(Math.max(0, pay.remaining - paymentForm.montant), devise)}`
                          }
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button type="button"
                        className="btn flex-1 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                        onClick={() => setPayFormOpen(false)} disabled={busy}>
                        Annuler
                      </button>
                      <button type="button"
                        className="btn flex-1 bg-sky-600 hover:bg-sky-700 text-white dark:bg-sky-500 dark:hover:bg-sky-600 inline-flex items-center justify-center gap-1.5 font-semibold"
                        onClick={addPayment} disabled={busy || paymentForm.montant <= 0}>
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                        Enregistrer
                      </button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Pénalités (si présentes) */}
              {Array.isArray((r as any)?.penalites) && (r as any).penalites.length > 0 && (
                <Card
                  title="Pénalités appliquées"
                  icon={<AlertTriangle size={15} />}
                  right={<Chip tone="amber">{(r as any).penalites.length}</Chip>}
                >
                  <div className="space-y-2">
                    {(r as any).penalites.map((p: any) => {
                      const typeLabels: Record<string, string> = {
                        annulation: 'Annulation',
                        modification: 'Modification',
                        no_show: 'No-show',
                        autre: 'Autre',
                      }
                      const traitementLabels: Record<string, string> = {
                        deduit_avoir: 'Avoir créé',
                        facture_separee: 'Facture séparée',
                        retenu_paiement: 'Retenu sur paiement',
                      }
                      const traitementIcons: Record<string, JSX.Element> = {
                        deduit_avoir: <PiggyBank size={11} />,
                        facture_separee: <FileText size={11} />,
                        retenu_paiement: <CreditCard size={11} />,
                      }
                      const imposedBy = p.imposed_by
                        ? `${p.imposed_by.prenom || ''} ${p.imposed_by.nom || ''}`.trim() || `User #${p.imposed_by.id}`
                        : '—'
                      return (
                        <div
                          key={p.id}
                          className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/[0.05]"
                        >
                          <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                            <AlertTriangle size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {typeLabels[p.type] || p.type}
                              </span>
                              <span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-300">
                                {new Intl.NumberFormat('fr-FR').format(Number(p.montant))} {devise}
                              </span>
                              <Chip tone="gray">
                                <span className="inline-flex items-center gap-1">
                                  {traitementIcons[p.traitement]}
                                  {traitementLabels[p.traitement] || p.traitement}
                                </span>
                              </Chip>
                            </div>
                            {p.motif && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {p.motif}
                              </div>
                            )}
                            <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <Clock size={9} />
                                {safeDate(p.imposed_at || p.created_at)}
                              </span>
                              <span>·</span>
                              <span>par {imposedBy}</span>
                              {p.avoir && (
                                <>
                                  <span>·</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    Avoir #{p.avoir.id} créé ({new Intl.NumberFormat('fr-FR').format(Number(p.avoir.montant))} {devise})
                                  </span>
                                </>
                              )}
                              {p.facture && (
                                <>
                                  <span>·</span>
                                  <span className="text-sky-600 dark:text-sky-400 font-medium">
                                    Facture {p.facture.numero || `#${p.facture.id}`} émise
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}

              {/* Historique paiements */}
              <Card title="Historique des paiements" icon={<CreditCard size={15} />}>
                {!pay.facture ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aucune facture liée à cette réservation.</p>
                    <button type="button" onClick={ensureAndDownloadInvoice} disabled={!!busyInvoiceId || busy}
                      className="btn w-full bg-gray-100 dark:bg-white/[0.07] border border-black/[0.06] dark:border-white/[0.09] inline-flex items-center justify-center gap-2">
                      <Receipt size={14} /> Créer & télécharger la facture
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.07]">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          <Receipt size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{pay.facture?.numero || `Facture #${pay.facture?.id}`}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{safeDate(pay.facture?.date_facture || pay.facture?.created_at)}</div>
                        </div>
                      </div>
                      <button type="button" onClick={() => downloadFacturePdf(Number(pay.facture.id), pay.facture?.numero)} disabled={busy}
                        className="btn shrink-0 bg-gray-200 dark:bg-white/10 inline-flex items-center gap-1">
                        <Download size={13} /> PDF
                      </button>
                    </div>

                    {pay.paiements.length > 0 ? (
                      <div className="space-y-1.5">
                        {[...pay.paiements]
                          .sort((a: any, b: any) =>
                            +new Date(b?.date_paiement || b?.created_at || 0) -
                            +new Date(a?.date_paiement || a?.created_at || 0)
                          )
                          .map((p: any) => {
                            const st = normalizeStatut(p?.statut)
                            const ok = !p?.statut || st === 'recu' || st === 'reçu'
                            return (
                              <div key={p?.id || `${p?.mode_paiement}-${p?.created_at}`}
                                className="flex items-center gap-3 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-panel px-3 py-1.5">
                                <div className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                  ok ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                     : 'bg-gray-100 dark:bg-white/10 text-gray-500')}>
                                  <PayModeIcon mode={p?.mode_paiement} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
                                      {String(p?.mode_paiement || '—').replace('_', ' ')}
                                    </span>
                                    {p?.reference && <span className="text-xs text-gray-400 dark:text-gray-500">({p.reference})</span>}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{safeDate(p?.date_paiement || p?.created_at)}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{money(p?.montant, devise)}</div>
                                  <Chip tone={ok ? 'green' : 'gray'}>{p?.statut || '—'}</Chip>
                                </div>
                              </div>
                            )
                          })}
                        {pay.paiements.length > 1 && (
                          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.07] mt-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total encaissé</span>
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{money(pay.paid, devise)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Aucun paiement enregistré.</p>
                    )}
                  </div>
                )}
              </Card>

              {/* Metadata */}
              <Card title="Informations" icon={<Info size={15} />}>
                <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                  <KV label="ID" value={<span className="font-mono text-xs">{r?.id ?? '—'}</span>} />
                  <KV label="Référence" value={<span className="font-mono font-bold">{ref}</span>} />
                  <KV label="Type" value={typeMeta.label} />
                  <KV label="Statut" value={<StatutBadge statut={r?.statut} />} />
                  <KV label="Devise" value={devise} />
                  <KV label="Créée le" value={safeDate(r?.created_at)} />
                  <KV label="Mise à jour" value={safeDate(r?.updated_at)} />
                </div>
              </Card>

            </div>
          </div>
        </div>
      ) : null}

      {/* ── Modal édition ── */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modifier la réservation"
        widthClass="max-w-4xl"
      >
        <ReservationsForm
          defaultValues={r ?? undefined}
          submitting={mUpdate.isPending}
          onCancel={() => setEditOpen(false)}
          onSubmit={(vals) => mUpdate.mutate({ ...vals, id: Number(id) } as any)}
        />
      </Modal>

      {/* ── Modal pénalité ── */}
      {r && (
        <PenaltyModal
          open={penaltyOpen}
          onClose={() => setPenaltyOpen(false)}
          reservation={r}
          withCancel={r.statut !== 'annulee' && r.statut !== 'annulée'}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['reservation', Number(id)] })}
        />
      )}

      {/* ── Modal WhatsApp ── */}
      {r && (
        <WhatsAppSendModal
          open={waOpen}
          onClose={() => setWaOpen(false)}
          defaultTemplate={r.statut === 'confirmee' || r.statut === 'confirmée' ? 'reservationConfirmed' : 'devis'}
          context={{
            client: {
              prenom: client?.prenom ?? null,
              nom: client?.nom ?? null,
              telephone: client?.telephone ?? null,
            },
            reservation: {
              reference: r.reference,
              type: r.type,
              montant_total: r.montant_total,
              devise: r.devise,
              statut: r.statut,
            },
            agencyName: 'Universal Tours',
          }}
          allowedTemplates={['reservationConfirmed', 'devis', 'paymentReceived', 'custom']}
        />
      )}

    </div>
  )
}
