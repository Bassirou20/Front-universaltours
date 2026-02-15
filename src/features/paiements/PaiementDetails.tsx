import React, { useMemo, useState } from 'react'
import { Badge } from '../../ui/Badge'
import {
  Calendar,
  Receipt,
  Hash,
  Wallet,
  Info,
  Copy,
  Check,
  CreditCard,
  FileText,
} from 'lucide-react'

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
  // backend: "notes" (PaiementController)
  notes?: string | null
  // compat: certains front utilisaient "note"
  note?: string | null
  date_paiement?: string | null
  created_at?: string | null
  facture?: FactureLite | null
}

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ')
}

const MODE_LABEL: Record<string, string> = {
  especes: 'Espèces',
  orange_money: 'Orange Money',
  wave: 'Wave',
  carte: 'Carte',
  virement: 'Virement',
  cheque: 'Chèque',
  free_money: 'Free Money',
}

const modeTone = (m?: string | null) => {
  const x = (m || '').toLowerCase()
  if (x.includes('orange')) return 'amber'
  if (x.includes('wave')) return 'blue'
  if (x.includes('virement')) return 'purple'
  if (x.includes('carte')) return 'green'
  if (x.includes('free')) return 'purple'
  if (x.includes('cheque') || x.includes('chèque')) return 'gray'
  return 'gray'
}

const statutTone = (s?: string | null) => {
  const v = (s || '').toLowerCase()
  if (v === 'recu' || v === 'reçu') return 'green'
  if (v === 'en_attente') return 'amber'
  if (v === 'annule' || v === 'annulé') return 'red'
  return 'gray'
}

const statutLabel = (s?: string | null) => {
  const v = (s || '').toLowerCase()
  if (v === 'recu' || v === 'reçu') return 'Reçu'
  if (v === 'en_attente') return 'En attente'
  if (v === 'annule' || v === 'annulé') return 'Annulé'
  return s || '—'
}

const money = (n: any, devise = 'XOF') => `${Number(n || 0).toLocaleString()} ${devise}`

function safeDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString()
}

function Card({
  title,
  icon,
  right,
  children,
}: {
  title: string
  icon?: React.ReactNode
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft">
      <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon ? <span className="text-gray-700 dark:text-gray-200">{icon}</span> : null}
          <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right max-w-[65%] break-words">
        {value ?? '—'}
      </div>
    </div>
  )
}

export const PaiementDetails: React.FC<{ paiement: PaiementModel }> = ({ paiement }) => {
  const [copied, setCopied] = useState(false)

  const dateLabel = useMemo(
    () => safeDate(paiement.date_paiement || paiement.created_at),
    [paiement.date_paiement, paiement.created_at]
  )

  const factureNumero = paiement.facture?.numero ?? null
  const factureLabel = factureNumero ? factureNumero : `Facture #${paiement.facture_id}`

  const modeKey = (paiement.mode_paiement || '').toLowerCase()
  const modeLabel = MODE_LABEL[modeKey] || paiement.mode_paiement || '—'

  const note = paiement.notes ?? paiement.note ?? null

  const factureTotal =
    Number(
      paiement.facture?.total ??
        paiement.facture?.montant_total ??
        0
    ) || 0

  // “reste estimé” (juste indicatif si on n’a pas tous les paiements)
  const remainingEst = factureTotal > 0 ? Math.max(0, factureTotal - Number(paiement.montant || 0)) : null

  const copyRef = async () => {
    const text = paiement.reference || ''
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold flex items-center gap-2">
              <Wallet size={18} />
              <span className="truncate">Paiement #{paiement.id}</span>
            </div>

            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} /> {dateLabel}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Receipt size={12} /> {factureLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge tone="blue">
              <span className="inline-flex items-center gap-1">
                <FileText size={14} /> {factureLabel}
              </span>
            </Badge>

            <Badge tone={modeTone(modeKey) as any}>
              <span className="inline-flex items-center gap-1">
                <CreditCard size={14} /> {modeLabel}
              </span>
            </Badge>

            {paiement.statut ? (
              <Badge tone={statutTone(paiement.statut) as any}>{statutLabel(paiement.statut)}</Badge>
            ) : null}
          </div>
        </div>

        {/* Quick KPIs */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">Montant</div>
            <div className="text-lg font-semibold">{money(paiement.montant)}</div>
          </div>

          <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">Référence</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="font-semibold break-words">{paiement.reference || '—'}</div>
              {paiement.reference ? (
                <button
                  type="button"
                  className={cx('btn px-2 bg-gray-200 dark:bg-white/10', copied && 'opacity-80')}
                  onClick={copyRef}
                  title="Copier la référence"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">Reste (estimé)</div>
            <div className="text-lg font-semibold">{remainingEst == null ? '—' : money(remainingEst)}</div>
            <div className="text-[11px] text-gray-500 mt-1">
              * estimation si d’autres paiements existent.
            </div>
          </div>
        </div>
      </div>

      {/* Facture */}
      <Card title="Facture" icon={<Info size={18} />}>
        <div className="space-y-2">
          <KV label="Numéro" value={factureNumero ?? `#${paiement.facture_id}`} />
          <KV label="Statut" value={paiement.facture?.statut ?? '—'} />
          <KV label="Date facture" value={safeDate(paiement.facture?.date_facture || paiement.facture?.created_at)} />
          <KV label="Total facture" value={money(factureTotal)} />
        </div>
      </Card>

      {/* Notes */}
      <Card title="Notes" icon={<Hash size={18} />}>
        <div className="text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-100">
          {note ? note : <span className="text-gray-400">—</span>}
        </div>
      </Card>
    </div>
  )
}

export default PaiementDetails
