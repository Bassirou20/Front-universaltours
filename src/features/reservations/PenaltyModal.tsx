// src/features/reservations/PenaltyModal.tsx
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useToast } from '../../ui/Toasts'
import {
  X, AlertTriangle, XCircle, RefreshCw, UserX, Info,
  PiggyBank, FileText, Wallet, ChevronLeft, ChevronRight,
  CheckCircle2, Loader2,
} from 'lucide-react'

type PenaltyType = 'annulation' | 'modification' | 'no_show' | 'autre'
type Treatment = 'deduit_avoir' | 'facture_separee' | 'retenu_paiement'

type Props = {
  open: boolean
  onClose: () => void
  reservation: {
    id: number
    reference?: string | null
    montant_total?: number | null
    devise?: string | null
    statut?: string | null
    client?: { prenom?: string | null; nom?: string | null } | null
    factures?: any[] | { data?: any[] } | null
  }
  // Si true, propose aussi d'annuler la réservation dans la même action
  withCancel?: boolean
  onSuccess?: () => void
}

const money = (n: number, currency = 'XOF') =>
  `${new Intl.NumberFormat('fr-FR').format(Math.round(n))} ${currency}`

function paidAmount(reservation: Props['reservation']): number {
  const list = Array.isArray(reservation.factures)
    ? reservation.factures
    : Array.isArray((reservation.factures as any)?.data)
      ? (reservation.factures as any).data
      : []
  let total = 0
  for (const f of list) {
    const paies = Array.isArray(f?.paiements) ? f.paiements : []
    for (const p of paies) {
      if (String(p?.statut || '').toLowerCase() === 'recu') {
        total += Number(p?.montant || 0)
      }
    }
  }
  return total
}

export default function PenaltyModal({ open, onClose, reservation, withCancel = true, onSuccess }: Props) {
  const qc = useQueryClient()
  const toast = useToast()

  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [type, setType] = useState<PenaltyType>('annulation')
  const [montant, setMontant] = useState<number>(0)
  const [motif, setMotif] = useState('')
  const [traitement, setTraitement] = useState<Treatment>('deduit_avoir')
  const [alsoCancel, setAlsoCancel] = useState(true)

  const currency = reservation.devise || 'XOF'
  const total = Number(reservation.montant_total || 0)
  const paid = useMemo(() => paidAmount(reservation), [reservation])

  // Suggestions de pourcentage selon le type
  const percentages = useMemo(() => {
    if (type === 'no_show') return [100]
    if (type === 'modification') return [10, 25, 50]
    return [25, 50, 75, 100]
  }, [type])

  // Reset à l'ouverture
  useEffect(() => {
    if (open) {
      setStep(0)
      setType(withCancel ? 'annulation' : 'modification')
      setMontant(0)
      setMotif('')
      setTraitement(paid > 0 ? 'deduit_avoir' : 'retenu_paiement')
      setAlsoCancel(withCancel)
    }
  }, [open, withCancel, paid])

  // Ferme avec Échap
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const mSubmit = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/reservations/${reservation.id}/penalize`, {
        type,
        montant,
        motif: motif.trim() || undefined,
        traitement,
        cancel: alsoCancel,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['reservations', String(reservation.id)] })
      toast.push({ title: 'Pénalité appliquée ✓', tone: 'success' })
      onClose()
      onSuccess?.()
    },
    onError: (e: any) => {
      toast.push({ title: e?.response?.data?.message || 'Erreur lors de l\'application', tone: 'error' })
    },
  })

  // Aperçu du résultat selon le traitement
  // ⚠️ Doit rester AVANT le early-return pour respecter les Rules of Hooks
  const preview = useMemo(() => {
    if (traitement === 'deduit_avoir') {
      const remb = Math.max(0, paid - montant)
      return {
        title: 'Avoir client',
        lines: [
          { label: 'Déjà payé par le client', value: money(paid, currency) },
          { label: 'Pénalité retenue', value: '- ' + money(montant, currency), warn: true },
          { label: 'Avoir crédité au client', value: money(remb, currency), good: remb > 0 },
        ],
      }
    }
    if (traitement === 'facture_separee') {
      return {
        title: 'Facture séparée',
        lines: [
          { label: 'Pénalité due (nouvelle facture)', value: money(montant, currency), warn: true },
          { label: 'Échéance', value: '15 jours' },
        ],
      }
    }
    return {
      title: 'Retenu sur paiement',
      lines: [
        { label: 'Pénalité due', value: money(montant, currency), warn: true },
        { label: 'Aucun paiement reçu encore', value: '—' },
      ],
    }
  }, [traitement, paid, montant, currency])

  if (!open) return null

  const canGoNext =
    (step === 0 && !!type) ||
    (step === 1 && montant > 0) ||
    (step === 2 && !!traitement)

  const clientFullName = [reservation.client?.prenom, reservation.client?.nom].filter(Boolean).join(' ') || '—'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[520px] bg-white dark:bg-panel rounded-2xl shadow-2xl overflow-hidden text-gray-900 dark:text-gray-100">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
            <div>
              <div className="text-[16px] font-bold tracking-[-0.01em]">
                {withCancel ? 'Annuler avec pénalité' : 'Appliquer une pénalité'}
              </div>
              <div className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0.5">
                Réservation <span className="font-mono">{reservation.reference || `#${reservation.id}`}</span> · {clientFullName}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={mSubmit.isPending}
            className="shrink-0 w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] flex items-center justify-center transition disabled:opacity-40"
          >
            <X size={14} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between gap-1 px-5 pb-4">
          {(['Motif', 'Montant', 'Traitement'] as const).map((label, i) => (
            <div key={label} className="flex-1 flex items-center gap-1.5">
              <div className={[
                'shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition',
                i < step
                  ? 'bg-emerald-500 text-white'
                  : i === step
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-200 dark:bg-white/10 text-gray-400',
              ].join(' ')}>
                {i < step ? <CheckCircle2 size={12} /> : i + 1}
              </div>
              <span className={[
                'text-[10.5px] font-medium truncate',
                i === step ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500',
              ].join(' ')}>{label}</span>
              {i < 2 && <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="px-5 pb-4 min-h-[280px]">
          {/* ── STEP 0 : MOTIF ── */}
          {step === 0 && (
            <div className="space-y-2.5">
              <div className="text-[12.5px] text-gray-500 dark:text-gray-400">
                Pourquoi appliquez-vous une pénalité ?
              </div>
              {([
                { value: 'annulation', icon: <XCircle size={15} />, label: 'Annulation par le client', hint: 'Le client souhaite annuler sa réservation' },
                { value: 'modification', icon: <RefreshCw size={15} />, label: 'Modification', hint: 'Changement de date, nom, vol…' },
                { value: 'no_show', icon: <UserX size={15} />, label: 'No-show', hint: 'Client absent à l\'embarquement' },
                { value: 'autre', icon: <Info size={15} />, label: 'Autre', hint: 'Cas particulier (frais fournisseur, etc.)' },
              ] as const).map((opt) => {
                const active = type === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value as PenaltyType)}
                    className={[
                      'w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition',
                      active
                        ? 'border-[var(--ut-orange)] bg-[var(--ut-orange)]/5'
                        : 'border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-white/[0.02] hover:border-black/15 dark:hover:border-white/15',
                    ].join(' ')}
                  >
                    <div className={[
                      'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
                      active
                        ? 'bg-[var(--ut-orange)] text-white'
                        : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400',
                    ].join(' ')}>
                      {opt.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold">{opt.label}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{opt.hint}</div>
                    </div>
                    {active && <CheckCircle2 size={14} className="shrink-0 text-[var(--ut-orange)]" />}
                  </button>
                )
              })}
            </div>
          )}

          {/* ── STEP 1 : MONTANT ── */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="text-[12.5px] text-gray-500 dark:text-gray-400">
                Quel montant de pénalité retenir ?
              </div>

              {/* Récap réservation */}
              <div className="rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] px-3 py-2 space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total réservation</span>
                  <span className="font-semibold tabular-nums">{money(total, currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Payé par le client</span>
                  <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{money(paid, currency)}</span>
                </div>
              </div>

              {/* Suggestions % */}
              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Suggestions
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {percentages.map((p) => {
                    const v = Math.round((total * p) / 100)
                    const active = montant === v
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setMontant(v)}
                        className={[
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition border',
                          active
                            ? 'bg-[var(--ut-orange)] text-white border-[var(--ut-orange)]'
                            : 'bg-white dark:bg-white/[0.04] border-black/10 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:border-[var(--ut-orange)]',
                        ].join(' ')}
                      >
                        <span className="font-bold">{p}%</span>
                        <span className="text-[10.5px] opacity-75 tabular-nums">{money(v, currency)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Montant custom */}
              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Montant exact
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={montant || ''}
                    onChange={(e) => setMontant(Number(e.target.value) || 0)}
                    className="w-full pl-3 pr-16 py-2.5 border border-black/[0.14] dark:border-white/15 rounded-lg bg-white dark:bg-white/[0.03] text-[14px] font-semibold tabular-nums outline-none transition focus:border-[var(--ut-orange)] focus:ring-[3px] focus:ring-[var(--ut-orange)]/15"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400">
                    {currency}
                  </span>
                </div>
              </div>

              {/* Motif */}
              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Motif (optionnel)
                </label>
                <textarea
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-black/[0.14] dark:border-white/15 rounded-lg bg-white dark:bg-white/[0.03] text-[12.5px] outline-none transition focus:border-[var(--ut-orange)] focus:ring-[3px] focus:ring-[var(--ut-orange)]/15 resize-none"
                  placeholder="Précisez le contexte de la pénalité…"
                  maxLength={500}
                />
              </div>
            </div>
          )}

          {/* ── STEP 2 : TRAITEMENT ── */}
          {step === 2 && (
            <div className="space-y-2.5">
              <div className="text-[12.5px] text-gray-500 dark:text-gray-400">
                Comment traiter cette pénalité ?
              </div>

              {([
                {
                  value: 'deduit_avoir',
                  icon: <PiggyBank size={15} />,
                  label: 'Créer un avoir client',
                  hint: paid > 0
                    ? `Pénalité retenue, ${money(Math.max(0, paid - montant), currency)} sera crédité comme avoir`
                    : 'Aucun paiement encore — désactivé',
                  disabled: paid === 0,
                },
                {
                  value: 'facture_separee',
                  icon: <FileText size={15} />,
                  label: 'Émettre une facture séparée',
                  hint: 'Nouvelle facture de pénalité (échéance 15j)',
                  disabled: false,
                },
                {
                  value: 'retenu_paiement',
                  icon: <Wallet size={15} />,
                  label: 'Retenu sur paiement',
                  hint: 'Le client doit cette pénalité (pas de paiement encore)',
                  disabled: false,
                },
              ] as const).map((opt) => {
                const active = traitement === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => !opt.disabled && setTraitement(opt.value as Treatment)}
                    disabled={opt.disabled}
                    className={[
                      'w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition',
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed border-black/[0.07] dark:border-white/[0.08] bg-gray-50/40 dark:bg-white/[0.01]'
                        : active
                        ? 'border-[var(--ut-orange)] bg-[var(--ut-orange)]/5'
                        : 'border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-white/[0.02] hover:border-black/15 dark:hover:border-white/15',
                    ].join(' ')}
                  >
                    <div className={[
                      'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
                      active
                        ? 'bg-[var(--ut-orange)] text-white'
                        : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400',
                    ].join(' ')}>
                      {opt.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold">{opt.label}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{opt.hint}</div>
                    </div>
                    {active && <CheckCircle2 size={14} className="shrink-0 text-[var(--ut-orange)]" />}
                  </button>
                )
              })}

              {/* Récap visuel du résultat */}
              <div className="mt-3 rounded-lg border border-black/[0.08] dark:border-white/[0.10] bg-gray-50/60 dark:bg-white/[0.03] p-3">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Aperçu : {preview.title}
                </div>
                <div className="space-y-1">
                  {preview.lines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px]">
                      <span className="text-gray-600 dark:text-gray-400">{l.label}</span>
                      <span className={[
                        'font-semibold tabular-nums',
                        (l as any).warn ? 'text-amber-700 dark:text-amber-400' :
                        (l as any).good ? 'text-emerald-700 dark:text-emerald-400' :
                        'text-gray-900 dark:text-gray-100',
                      ].join(' ')}>{l.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Option : annuler la résa en même temps */}
              {withCancel && reservation.statut !== 'annulee' && (
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/[0.08] border border-rose-200 dark:border-rose-500/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alsoCancel}
                    onChange={(e) => setAlsoCancel(e.target.checked)}
                    className="w-3.5 h-3.5 accent-rose-500"
                  />
                  <span className="text-[12px] text-rose-800 dark:text-rose-300 font-medium">
                    Annuler la réservation en même temps (statut → Annulée)
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => step === 0 ? onClose() : setStep((step - 1) as 0 | 1)}
            disabled={mSubmit.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-gray-600 dark:text-gray-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-gray-100 transition disabled:opacity-40"
          >
            <ChevronLeft size={13} />
            {step === 0 ? 'Annuler' : 'Précédent'}
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as 1 | 2)}
              disabled={!canGoNext}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12.5px] font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:opacity-90 transition disabled:opacity-40"
            >
              Suivant
              <ChevronRight size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => mSubmit.mutate()}
              disabled={!canGoNext || mSubmit.isPending}
              className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-lg text-[12.5px] font-semibold text-white bg-gradient-to-br from-amber-500 to-orange-600 hover:brightness-110 shadow-sm transition disabled:opacity-50"
            >
              {mSubmit.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Application…
                </>
              ) : (
                <>
                  <AlertTriangle size={13} />
                  {alsoCancel && withCancel ? 'Annuler & appliquer' : 'Appliquer la pénalité'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
