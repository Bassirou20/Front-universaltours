import React, { useMemo, useState } from 'react'
import { Badge } from '../../ui/Badge'
import {
  Calendar, Receipt, Hash, Wallet, Info, Copy, Check,
  CreditCard, FileText, Banknote, Smartphone, Building2,
  CheckCircle2, Clock, AlertCircle,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type FactureLite = {
  id: number
  numero?: string | null
  total?: number | null
  montant_total?: number | null
  statut?: string | null
  created_at?: string | null
  date_facture?: string | null
}

export type PaiementModel = {
  id: number
  facture_id: number
  montant: number
  mode_paiement?: string | null
  reference?: string | null
  statut?: string | null
  notes?: string | null
  note?: string | null
  date_paiement?: string | null
  created_at?: string | null
  facture?: FactureLite | null
}

// ─── Config ──────────────────────────────────────────────────────────────────

const MODE_CONFIG: Record<string, {
  label: string
  icon: React.ReactNode
  color: string
  bg: string
}> = {
  especes:      { label: 'Espèces',      icon: <Banknote size={14} />,   color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-500/15' },
  orange_money: { label: 'Orange Money', icon: <Smartphone size={14} />, color: 'text-orange-700 dark:text-orange-300',  bg: 'bg-orange-100 dark:bg-orange-500/15'  },
  wave:         { label: 'Wave',         icon: <Smartphone size={14} />, color: 'text-sky-700 dark:text-sky-300',        bg: 'bg-sky-100 dark:bg-sky-500/15'        },
  carte:        { label: 'Carte',        icon: <CreditCard size={14} />, color: 'text-violet-700 dark:text-violet-300',  bg: 'bg-violet-100 dark:bg-violet-500/15'  },
  virement:     { label: 'Virement',     icon: <Building2 size={14} />,  color: 'text-blue-700 dark:text-blue-300',      bg: 'bg-blue-100 dark:bg-blue-500/15'      },
  cheque:       { label: 'Chèque',       icon: <FileText size={14} />,   color: 'text-gray-700 dark:text-gray-300',      bg: 'bg-gray-100 dark:bg-white/10'         },
  free_money:   { label: 'Free Money',   icon: <Smartphone size={14} />, color: 'text-purple-700 dark:text-purple-300',  bg: 'bg-purple-100 dark:bg-purple-500/15'  },
}

const STATUT_CONFIG: Record<string, {
  label: string; icon: React.ReactNode; tone: string; cls: string
}> = {
  recu:       { label: 'Reçu',       icon: <CheckCircle2 size={13} />, tone: 'green',  cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15' },
  reçu:       { label: 'Reçu',       icon: <CheckCircle2 size={13} />, tone: 'green',  cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15' },
  en_attente: { label: 'En attente', icon: <Clock size={13} />,        tone: 'amber',  cls: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15'         },
  annule:     { label: 'Annulé',     icon: <AlertCircle size={13} />,  tone: 'red',    cls: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/10'                },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const money = (n: any) => `${Number(n || 0).toLocaleString('fr-FR')} XOF`

function safeDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('fr-FR')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, icon, right, children }: {
  title: string; icon?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-sm">
      <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
          <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right max-w-[65%] break-words">
        {value ?? '—'}
      </div>
    </div>
  )
}

function PaymentProgress({ paid, total }: { paid: number; total: number }) {
  if (!total) return null
  const pct  = Math.min(100, (paid / total) * 100)
  const done = pct >= 99.9

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Avancement du paiement</span>
        <span className={done ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold'}>
          {pct.toFixed(0)} %
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.07] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-emerald-500' : 'bg-sky-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-400">
        <span>Payé {money(paid)}</span>
        {!done && <span>Reste estimé {money(Math.max(0, total - paid))}</span>}
        {done  && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"><CheckCircle2 size={11} /> Soldé</span>}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PaiementDetails: React.FC<{ paiement: PaiementModel }> = ({ paiement }) => {
  const [copied, setCopied] = useState(false)

  const dateLabel    = useMemo(() => safeDate(paiement.date_paiement || paiement.created_at), [paiement])
  const factureLabel = paiement.facture?.numero ?? `Facture #${paiement.facture_id}`
  const modeKey      = (paiement.mode_paiement || '').toLowerCase()
  const modeCfg      = MODE_CONFIG[modeKey]
  const statutKey    = (paiement.statut || '').toLowerCase()
  const statutCfg    = STATUT_CONFIG[statutKey]
  const note         = paiement.notes ?? paiement.note ?? null
  const factureTotal = Number(paiement.facture?.total ?? paiement.facture?.montant_total ?? 0) || 0
  const paidAmt      = Number(paiement.montant || 0)

  const copyRef = async () => {
    const text = paiement.reference || ''
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-3">

      {/* ── Header card ── */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-sm overflow-hidden">
        {/* top accent */}
        <div className={`h-[3px] w-full ${paidAmt > 0 ? 'bg-gradient-to-r from-emerald-400 to-sky-500' : 'bg-gray-200 dark:bg-white/10'}`} />

        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Wallet size={18} className="text-sky-500 shrink-0" />
                Paiement #{paiement.id}
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1"><Calendar size={11} /> {dateLabel}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Receipt size={11} /> {factureLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {modeCfg && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${modeCfg.color} ${modeCfg.bg}`}>
                  {modeCfg.icon} {modeCfg.label}
                </span>
              )}
              {statutCfg && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statutCfg.cls}`}>
                  {statutCfg.icon} {statutCfg.label}
                </span>
              )}
            </div>
          </div>

          {/* KPI mini-grid */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Montant</div>
              <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{money(paiement.montant)}</div>
            </div>

            <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Référence</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-semibold break-all text-sm">{paiement.reference || '—'}</span>
                {paiement.reference && (
                  <button
                    type="button"
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                    onClick={copyRef}
                    title="Copier la référence"
                  >
                    {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Total facture</div>
              <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{factureTotal > 0 ? money(factureTotal) : '—'}</div>
            </div>
          </div>

          {/* Progress bar */}
          {factureTotal > 0 && (
            <div className="mt-4">
              <PaymentProgress paid={paidAmt} total={factureTotal} />
            </div>
          )}
        </div>
      </div>

      {/* ── Facture info ── */}
      <Card title="Facture associée" icon={<FileText size={16} />}>
        <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
          <KV label="Numéro"       value={paiement.facture?.numero ?? `#${paiement.facture_id}`} />
          <KV label="Statut"       value={paiement.facture?.statut ?? '—'} />
          <KV label="Date facture" value={safeDate(paiement.facture?.date_facture || paiement.facture?.created_at)} />
          <KV label="Total"        value={factureTotal > 0 ? money(factureTotal) : '—'} />
        </div>
      </Card>

      {/* ── Notes ── */}
      <Card title="Notes" icon={<Hash size={16} />}>
        <div className="text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-100 leading-relaxed">
          {note ? note : <span className="text-gray-400 italic">Aucune note</span>}
        </div>
      </Card>
    </div>
  )
}

export default PaiementDetails
