// src/features/clients/ClientDetails.tsx
import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Phone, Mail, Globe, MapPin, CalendarDays, StickyNote,
  Copy, Check, X, Wallet, Pencil, Calendar, Loader2,
  ChevronRight, ChevronLeft, Plane, Building, Car, Shield,
  FileText, Layers, Star, CreditCard, TrendingUp, ReceiptText,
  CheckCircle2, Clock, AlertCircle, Package,
} from 'lucide-react'
import { api } from '../../lib/axios'
import { money } from '../../lib/helpers'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = { client: any; onClose: () => void; onEdit?: () => void }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initialsFromClient(c: any) {
  const a = String(c?.prenom || '').trim()
  const b = String(c?.nom || '').trim()
  const s = `${a} ${b}`.trim() || String(c?.nom || '').trim() || 'CL'
  const p = s.split(/\s+/).filter(Boolean)
  return `${p[0]?.[0] ?? 'C'}${p[1]?.[0] ?? p[0]?.[1] ?? 'L'}`.toUpperCase()
}

function displayClientName(c: any) {
  return [c?.prenom, c?.nom].filter(Boolean).join(' ').trim() || c?.nom || `Client #${c?.id ?? '—'}`
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function ToneBadge({ tone, children }: { tone: 'gray' | 'blue' | 'amber' | 'green' | 'red' | 'purple'; children: React.ReactNode }) {
  const cls: Record<string, string> = {
    green:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber:  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    blue:   'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    red:    'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
    gray:   'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls[tone] ?? cls.gray}`}>
      {children}
    </span>
  )
}

// ─── Reservation type config ──────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  billet_avion: { label: "Billet d'avion",    icon: <Plane size={13} />,    color: 'text-sky-700 dark:text-sky-300',      bg: 'bg-sky-100 dark:bg-sky-500/15'       },
  hotel:        { label: 'Hôtel',             icon: <Building size={13} />, color: 'text-amber-700 dark:text-amber-300',  bg: 'bg-amber-100 dark:bg-amber-500/15'   },
  voiture:      { label: 'Location voiture',  icon: <Car size={13} />,      color: 'text-gray-700 dark:text-gray-300',    bg: 'bg-gray-100 dark:bg-white/10'        },
  evenement:    { label: 'Événement',         icon: <Star size={13} />,     color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-500/15' },
  forfait:      { label: 'Forfait',           icon: <Layers size={13} />,   color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-500/15' },
  assurance:    { label: 'Assurance',         icon: <Shield size={13} />,   color: 'text-teal-700 dark:text-teal-300',    bg: 'bg-teal-100 dark:bg-teal-500/15'     },
  evisa:        { label: 'E-Visa',            icon: <FileText size={13} />, color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-500/15' },
}

const STATUT_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  confirmee:   { label: 'Confirmée',   icon: <CheckCircle2 size={12} />, cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15' },
  en_attente:  { label: 'En attente',  icon: <Clock size={12} />,        cls: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15'         },
  annulee:     { label: 'Annulée',     icon: <AlertCircle size={12} />,  cls: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-500/15'                 },
  brouillon:   { label: 'Brouillon',   icon: <FileText size={12} />,     cls: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/10'                },
}

function TypeBadge({ type }: { type?: string }) {
  const cfg = TYPE_CONFIG[type ?? '']
  if (!cfg) return <span className="text-xs text-gray-400">—</span>
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.color} ${cfg.bg}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function StatutBadge({ statut }: { statut?: string }) {
  const key = (statut || '').toLowerCase()
  const cfg = STATUT_CONFIG[key]
  if (!cfg) return statut ? <span className="text-xs text-gray-500">{statut}</span> : null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ─── InfoTile ─────────────────────────────────────────────────────────────────

function InfoTile({ icon, label, value, right }: { icon: React.ReactNode; label: string; value: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-semibold">{label}</div>
            <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{value ?? '—'}</div>
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  )
}

// ─── Stats mini card ──────────────────────────────────────────────────────────

function StatCard({ label, value, accent, icon }: { label: string; value: React.ReactNode; accent: string; icon: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-3 ${accent}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold opacity-70">{label}</div>
          <div className="mt-0.5 text-base font-bold">{value}</div>
        </div>
        <div className="opacity-60">{icon}</div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ClientDetails({ client, onClose, onEdit }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'reservations'>('info')
  const [resPage, setResPage]     = useState(1)
  const [resStatut, setResStatut] = useState('')
  const [resType, setResType]     = useState('')
  const perPage                   = 15

  const name     = useMemo(() => displayClientName(client), [client])
  const initials = useMemo(() => initialsFromClient(client), [client])
  const tel      = client?.telephone ? String(client.telephone) : ''
  const email    = client?.email     ? String(client.email) : ''

  // ── Solde avoir ──────────────────────────────────────────────────────────────

  const qSolde = useQuery({
    queryKey: ['avoir-solde', client?.id],
    queryFn: async () => { const { data } = await api.get(`/clients/${client.id}/solde-avoir`); return data },
    enabled: !!client?.id,
    staleTime: 30_000,
  })
  const soldeAvoir = Number(qSolde.data?.solde ?? 0)

  // ── Réservations — endpoint dédié ─────────────────────────────────────────

  const qReservations = useQuery({
    queryKey: ['client-reservations', client?.id, resPage, resStatut, resType],
    queryFn: async () => {
      const { data } = await api.get(`/clients/${client.id}/reservations`, {
        params: {
          per_page: perPage,
          page:     resPage,
          statut:   resStatut || undefined,
          type:     resType   || undefined,
        },
      })
      return data
    },
    enabled: !!client?.id,
    staleTime: 20_000,
    placeholderData: (prev: any) => prev,
  })

  // Parse paginated response: { client, reservations: { data, total, ... } }
  const resPaged     = useMemo(() => {
    const raw = qReservations.data?.reservations ?? qReservations.data
    if (!raw) return { items: [], total: 0, lastPage: 1 }
    if (Array.isArray(raw)) return { items: raw, total: raw.length, lastPage: 1 }
    return {
      items:    Array.isArray(raw.data) ? raw.data : [],
      total:    Number(raw.total ?? 0),
      lastPage: Number(raw.last_page ?? 1),
    }
  }, [qReservations.data])

  // ── Financial summary ────────────────────────────────────────────────────────

  const financialSummary = useMemo(() => {
    const items = resPaged.items
    let totalMontant = 0, totalPaye = 0
    for (const r of items) {
      const mt = Number(r?.montant_total ?? 0)
      totalMontant += mt
      for (const f of (Array.isArray(r?.factures) ? r.factures : [])) {
        if (f?.statut === 'annulee') continue
        for (const p of (Array.isArray(f?.paiements) ? f.paiements : [])) {
          const st = String(p?.statut ?? '').toLowerCase()
          if (st === 'recu' || st === 'reçu') totalPaye += Number(p?.montant ?? 0)
        }
      }
    }
    return { totalMontant, totalPaye, totalReste: Math.max(0, totalMontant - totalPaye) }
  }, [resPaged.items])

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const copy = async (key: string, value?: string) => {
    const v = String(value || '').trim()
    if (!v) return
    try { await navigator.clipboard.writeText(v); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 1200) } catch {}
  }

  const createdAt = safeDate(client?.created_at)
  const country   = client?.pays || '—'

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ── Header card ── */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-sm overflow-hidden">
        {/* accent bar */}
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-400 to-blue-500" />

        <div className="p-4">
          {/* top row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-gray-900 dark:text-white truncate">{name}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {client?.id     && <ToneBadge tone="blue">ID #{client.id}</ToneBadge>}
                  <ToneBadge tone="gray">Depuis {createdAt}</ToneBadge>
                  {country !== '—' && <ToneBadge tone="gray">{country}</ToneBadge>}
                  {resPaged.total > 0 && <ToneBadge tone="blue">{resPaged.total} réservation{resPaged.total > 1 ? 's' : ''}</ToneBadge>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onEdit && (
                <button type="button" className="btn bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-500/25" onClick={onEdit}>
                  <Pencil size={15} className="mr-1.5" /> Modifier
                </button>
              )}
              <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={onClose}><X size={16} /></button>
            </div>
          </div>

          {/* Solde avoir */}
          {!qSolde.isLoading && (
            <div className={`mt-3 flex items-center justify-between rounded-xl px-3 py-1.5 ${
              soldeAvoir > 0
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20'
                : 'bg-gray-50 dark:bg-white/[0.04] border border-black/5 dark:border-white/10'
            }`}>
              <div className="flex items-center gap-2">
                <Wallet size={15} className={soldeAvoir > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'} />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Solde avoir disponible</div>
                  <div className={`text-base font-bold ${soldeAvoir > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`}>
                    {money(soldeAvoir)}
                  </div>
                </div>
              </div>
              <Link
                to={`/avoirs?client_id=${client.id}`}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium"
                onClick={onClose}
              >
                Voir les avoirs →
              </Link>
            </div>
          )}

          {/* Actions rapides */}
          <div className="mt-3 flex flex-wrap gap-2">
            {/* ── Bouton principal : Voir l'historique des réservations ── */}
            <Link
              to={`/reservations?client_id=${client.id}&client_label=${encodeURIComponent(name)}`}
              className="btn-primary inline-flex items-center gap-1.5"
              onClick={onClose}
            >
              <Calendar size={15} /> Voir l'historique
            </Link>

            <button type="button" className={`btn bg-gray-100 dark:bg-white/10 ${!tel ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!tel} onClick={() => tel && window.open(`tel:${tel}`, '_self')}>
              <Phone size={15} className="mr-1.5" /> Appeler
            </button>
            <button type="button" className={`btn bg-gray-100 dark:bg-white/10 ${!email ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!email} onClick={() => email && window.open(`mailto:${email}`, '_self')}>
              <Mail size={15} className="mr-1.5" /> Email
            </button>
            <button type="button" className={`btn bg-gray-100 dark:bg-white/10 ${!tel ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!tel} onClick={() => copy('tel', tel)}>
              {copiedKey === 'tel' ? <Check size={14} className="mr-1.5 text-emerald-500" /> : <Copy size={14} className="mr-1.5" />} Copier tél.
            </button>
            <button type="button" className={`btn bg-gray-100 dark:bg-white/10 ${!email ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!email} onClick={() => copy('email', email)}>
              {copiedKey === 'email' ? <Check size={14} className="mr-1.5 text-emerald-500" /> : <Copy size={14} className="mr-1.5" />} Copier email
            </button>
            <Link to={`/factures?client_id=${client.id}&client_label=${encodeURIComponent(name)}`} className="btn bg-gray-100 dark:bg-white/10" onClick={onClose}>
              <ReceiptText size={15} className="mr-1.5" /> Factures
            </Link>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-white/[0.06] p-1 w-fit">
        {([
          { key: 'info',         label: 'Informations' },
          { key: 'reservations', label: `Réservations${resPaged.total > 0 ? ` (${resPaged.total})` : ''}` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
              activeTab === tab.key
                ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Informations ── */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contact */}
          <div className="space-y-3">
            <InfoTile icon={<Mail size={17} />} label="Email" value={client?.email || '—'}
              right={client?.email ? (
                <button type="button" className="btn px-2 bg-gray-100 dark:bg-white/10" onClick={() => copy('email', client.email)}>
                  {copiedKey === 'email' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              ) : undefined}
            />
            <InfoTile icon={<Phone size={17} />} label="Téléphone" value={client?.telephone || '—'}
              right={client?.telephone ? (
                <button type="button" className="btn px-2 bg-gray-100 dark:bg-white/10" onClick={() => copy('tel', client.telephone)}>
                  {copiedKey === 'tel' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              ) : undefined}
            />
            <InfoTile icon={<MapPin size={17} />} label="Adresse" value={client?.adresse || '—'} />
            <InfoTile icon={<Globe size={17} />}  label="Pays"    value={client?.pays || '—'} />
          </div>

          {/* Notes + système */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote size={15} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notes</span>
              </div>
              <div className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                {client?.notes?.trim() || <span className="text-gray-400 italic">Aucune note</span>}
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={15} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Informations système</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { label: 'Créé le',    val: safeDate(client?.created_at) },
                  { label: 'Mis à jour', val: safeDate(client?.updated_at) },
                  { label: 'ID',         val: `#${client?.id ?? '—'}` },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">{label}</div>
                    <div className="mt-1 font-semibold text-sm">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Réservations ── */}
      {activeTab === 'reservations' && (
        <div className="space-y-3">

          {/* Summary financier */}
          {resPaged.total > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                label="Total dépensé"
                value={money(financialSummary.totalMontant)}
                icon={<TrendingUp size={18} />}
                accent="border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              />
              <StatCard
                label="Montant payé"
                value={money(financialSummary.totalPaye)}
                icon={<CreditCard size={18} />}
                accent="border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-200"
              />
              <StatCard
                label="Reste dû"
                value={money(financialSummary.totalReste)}
                icon={<Clock size={18} />}
                accent={financialSummary.totalReste > 0
                  ? "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200"
                  : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-600 dark:text-gray-400"
                }
              />
            </div>
          )}

          {/* Filtres */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="input text-sm py-1.5 w-auto"
              value={resStatut}
              onChange={(e) => { setResStatut(e.target.value); setResPage(1) }}
            >
              <option value="">Tous les statuts</option>
              <option value="confirmee">Confirmée</option>
              <option value="en_attente">En attente</option>
              <option value="annulee">Annulée</option>
              <option value="brouillon">Brouillon</option>
            </select>

            <select
              className="input text-sm py-1.5 w-auto"
              value={resType}
              onChange={(e) => { setResType(e.target.value); setResPage(1) }}
            >
              <option value="">Tous les types</option>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            {(resStatut || resType) && (
              <button
                type="button"
                className="btn bg-gray-200 dark:bg-white/10 text-sm"
                onClick={() => { setResStatut(''); setResType(''); setResPage(1) }}
              >
                <X size={13} className="mr-1" /> Réinitialiser
              </button>
            )}

            <span className="ml-auto text-xs text-gray-400">
              {resPaged.total} réservation{resPaged.total > 1 ? 's' : ''}
            </span>
          </div>

          {/* Liste */}
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-sm overflow-hidden">
            {qReservations.isLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : resPaged.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  <Package size={22} className="text-gray-300 dark:text-gray-600" />
                </div>
                <div className="text-sm font-medium">Aucune réservation trouvée</div>
                {(resStatut || resType) && <p className="text-xs">Essaie de modifier les filtres.</p>}
              </div>
            ) : (
              <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                {resPaged.items.map((r: any) => {
                  const ref         = r?.reference || `#${r?.id}`
                  const destination = r?.forfait?.nom || r?.produit?.nom || r?.notes?.slice(0, 40) || '—'
                  const dateDepart  = r?.date_depart ? safeDate(r.date_depart) : safeDate(r?.created_at)
                  const montantTotal = Number(r?.montant_total ?? 0)

                  // Paiements calculés depuis factures
                  let totalPaye = 0
                  for (const f of (Array.isArray(r?.factures) ? r.factures : [])) {
                    if (f?.statut === 'annulee') continue
                    for (const p of (Array.isArray(f?.paiements) ? f.paiements : [])) {
                      const st = String(p?.statut ?? '').toLowerCase()
                      if (st === 'recu' || st === 'reçu') totalPaye += Number(p?.montant ?? 0)
                    }
                  }
                  const reste       = Math.max(0, montantTotal - totalPaye)
                  const payPct      = montantTotal > 0 ? Math.min(100, (totalPaye / montantTotal) * 100) : 0
                  const firstFactId = r?.factures?.[0]?.id

                  return (
                    <div key={r.id} className="p-4 hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start justify-between gap-3">

                        {/* Gauche */}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          {/* Ligne 1 : ref + badges */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-md">{ref}</span>
                            <TypeBadge   type={r?.type} />
                            <StatutBadge statut={r?.statut} />
                          </div>

                          {/* Ligne 2 : destination */}
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{destination}</div>

                          {/* Ligne 3 : date + nb personnes */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="inline-flex items-center gap-1"><Calendar size={11} /> {dateDepart}</span>
                            {r?.nombre_personnes > 1 && <span>{r.nombre_personnes} pers.</span>}
                          </div>

                          {/* Barre de progression paiement */}
                          {montantTotal > 0 && (
                            <div className="mt-2 space-y-1">
                              <div className="h-1.5 w-full max-w-xs rounded-full bg-black/[0.06] dark:bg-white/[0.07] overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${payPct >= 99.9 ? 'bg-emerald-500' : 'bg-sky-400'}`}
                                  style={{ width: `${payPct}%` }}
                                />
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Payé {money(totalPaye)}</span>
                                {reste > 0 && <span>Reste {money(reste)}</span>}
                                {payPct >= 99.9 && <span className="text-emerald-500 font-semibold">Soldé ✓</span>}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Droite */}
                        <div className="shrink-0 text-right space-y-1">
                          {montantTotal > 0 && (
                            <div className="text-base font-bold text-gray-900 dark:text-gray-100">{money(montantTotal)}</div>
                          )}
                          <div className="flex items-center gap-1.5 justify-end">
                            <Link
                              to={`/reservations?id=${r.id}`}
                              className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-medium"
                              onClick={onClose}
                            >
                              Voir <ChevronRight size={11} />
                            </Link>
                            {firstFactId && (
                              <Link
                                to={`/factures?id=${firstFactId}`}
                                className="inline-flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-medium"
                                onClick={onClose}
                              >
                                Facture <ChevronRight size={11} />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pagination réservations */}
          {resPaged.lastPage > 1 && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                className="btn bg-gray-200 dark:bg-white/10 inline-flex items-center gap-1.5"
                disabled={resPage <= 1}
                onClick={() => setResPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={15} /> Précédent
              </button>

              <span className="text-gray-500 dark:text-gray-400 text-xs">
                Page {resPage} / {resPaged.lastPage}
                <span className="ml-2">({resPaged.total} résultat{resPaged.total > 1 ? 's' : ''})</span>
              </span>

              <button
                type="button"
                className="btn bg-gray-200 dark:bg-white/10 inline-flex items-center gap-1.5"
                disabled={resPage >= resPaged.lastPage}
                onClick={() => setResPage(p => Math.min(resPaged.lastPage, p + 1))}
              >
                Suivant <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* Bouton : ouvrir la page Réservations filtrée */}
          <div className="flex justify-center">
            <Link
              to={`/reservations?client_id=${client.id}&client_label=${encodeURIComponent(name)}`}
              className="btn-primary inline-flex items-center gap-2 px-5"
              onClick={onClose}
            >
              <Calendar size={15} />
              Voir toutes les réservations dans la page
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
