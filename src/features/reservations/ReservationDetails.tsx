// src/features/reservations/ReservationDetails.tsx
import React, { useMemo, useState } from 'react'
import {
  BadgeCheck,
  CalendarClock,
  UserRound,
  Plane,
  Building2,
  Car,
  Ticket,
  Users,
  Receipt,
  Info,
  History,
  Download,
  FilePlus2,
  CreditCard,
} from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../ui/Toasts'

type ReservationDetailsModel = any

type Props = {
  reservation: ReservationDetailsModel
  onViewClientHistory?: (clientId: number, label?: string) => void
}

const ToneBadge: React.FC<{ children: React.ReactNode; tone?: 'green' | 'red' | 'amber' | 'gray' }> = ({
  children,
  tone = 'gray',
}) => {
  const tones: Record<string, string> = {
    green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    gray: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

const money = (n: any, devise = 'XOF') => `${Number(n || 0).toLocaleString()} ${devise}`

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
      <div className="flex items-center gap-2 font-semibold">
        {icon}
        <span>{title}</span>
      </div>
      <div className="mt-3 text-sm">{children}</div>
    </div>
  )
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="text-gray-600 dark:text-gray-400">{k}</div>
      <div className="text-right font-medium">{v}</div>
    </div>
  )
}

const sumPaid = (paiements: any[]) => (paiements || []).reduce((acc, p) => acc + Number(p?.montant || 0), 0)

const safeDate = (d: any) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString()
}

async function downloadBlobAsFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function ProgressBar({ value }: { value: number }) {
  const v = clamp(Number(value || 0), 0, 100)
  const tone =
    v >= 100 ? 'bg-green-500/70 dark:bg-green-400/60' : v > 0 ? 'bg-amber-500/70 dark:bg-amber-400/60' : 'bg-gray-400/70 dark:bg-white/20'

  return (
    <div className="w-full">
      <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className={`h-2 ${tone}`} style={{ width: `${v}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-400 flex items-center justify-between">
        <span>Payé</span>
        <span className="font-medium">{v}%</span>
      </div>
    </div>
  )
}

export const ReservationDetails: React.FC<Props> = ({ reservation, onViewClientHistory }) => {
  const toast = useToast()
  const r = reservation || {}

  const [busyInvoiceId, setBusyInvoiceId] = useState<number | null>(null)

  const clientName = [r?.client?.prenom, r?.client?.nom].filter(Boolean).join(' ') || r?.client?.nom || '—'
  const clientId = r?.client?.id ?? r?.client_id ?? null

  const statutTone = r?.statut === 'confirmee' ? 'green' : r?.statut === 'annulee' ? 'red' : 'amber'
  const statutLabel =
    r?.statut === 'confirmee' ? 'Confirmée' : r?.statut === 'annulee' ? 'Annulée' : r?.statut || 'En attente'

  const typeLabel =
    r?.type_label ||
    (r?.type === 'billet_avion'
      ? 'Billet d’avion'
      : r?.type === 'hotel'
      ? 'Hôtel'
      : r?.type === 'voiture'
      ? 'Voiture'
      : r?.type === 'evenement'
      ? 'Événement'
      : r?.type === 'forfait'
      ? 'Forfait'
      : r?.type || '—')

  const typeIcon =
    r?.type === 'billet_avion' ? (
      <Plane size={18} />
    ) : r?.type === 'hotel' ? (
      <Building2 size={18} />
    ) : r?.type === 'voiture' ? (
      <Car size={18} />
    ) : r?.type === 'evenement' || r?.type === 'forfait' ? (
      <Ticket size={18} />
    ) : (
      <Info size={18} />
    )

  const participants = Array.isArray(r?.participants) ? r.participants : []

  const factures = useMemo(() => {
    if (Array.isArray(r?.factures)) return r.factures
    if (r?.factures && typeof r.factures === 'object' && r.factures.id) return [r.factures]
    if (r?.facture && r.facture.id) return [r.facture]
    return []
  }, [r])

  // Vol: supporte flight_details (payload), flightDetails (relation), et fallback champs plats
  const fd = r?.flight_details || r?.flightDetails || r?.flight_detail || null
  const vol = {
    ville_depart: fd?.ville_depart ?? r?.ville_depart ?? null,
    ville_arrivee: fd?.ville_arrivee ?? r?.ville_arrivee ?? null,
    date_depart: fd?.date_depart ?? r?.date_depart ?? null,
    date_arrivee: fd?.date_arrivee ?? r?.date_arrivee ?? null,
    compagnie: fd?.compagnie ?? r?.compagnie ?? null,
    pnr: fd?.pnr ?? null,
    classe: fd?.classe ?? null,
  }

  const reservationTotal = Number(r?.montant_total || 0)
  const reservationSousTotal = Number(r?.montant_sous_total || 0)
  const reservationTaxes = Number(r?.montant_taxes || 0)

  const handleGeneratePdf = async (factureId: number) => {
    try {
      setBusyInvoiceId(factureId)

      const tries = [
        `/factures/${factureId}/generer-pdf`,
        `/factures/${factureId}/pdf/generate`,
        `/factures/${factureId}/pdf`,
      ]
      let ok = false

      for (const url of tries) {
        try {
          try {
            await api.get(url)
          } catch {
            await api.post(url)
          }
          ok = true
          break
        } catch {
          // next
        }
      }

      if (!ok) throw new Error('generation_failed')
      toast.push({ title: 'PDF généré', tone: 'success' })
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Impossible de générer le PDF.'
      toast.push({ title: msg, tone: 'error' })
    } finally {
      setBusyInvoiceId(null)
    }
  }

  const handleDownloadPdf = async (facture: any) => {
    const factureId = Number(facture?.id)
    if (!factureId) return

    try {
      setBusyInvoiceId(factureId)

      const filename = `${facture?.numero || `facture-${factureId}`}.pdf`

      const tries = [
        `/factures/${factureId}/telecharger-pdf`,
        `/factures/${factureId}/download`,
        `/factures/${factureId}/pdf`,
      ]

      let blob: Blob | null = null
      for (const url of tries) {
        try {
          const res = await api.get(url, { responseType: 'blob' })
          blob = res.data as Blob
          break
        } catch {
          // next
        }
      }

      if (!blob) throw new Error('download_failed')
      await downloadBlobAsFile(blob, filename)
      toast.push({ title: 'Téléchargement lancé', tone: 'success' })
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Impossible de télécharger la facture.'
      toast.push({ title: msg, tone: 'error' })
    } finally {
      setBusyInvoiceId(null)
    }
  }

  // -------------------- UI --------------------
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold flex items-center gap-2">
            {typeIcon}
            <span className="truncate">{typeLabel}</span>
          </div>
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Créée le {safeDate(r?.created_at)} • Mise à jour {safeDate(r?.updated_at)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ToneBadge tone={statutTone}>{statutLabel}</ToneBadge>
          <ToneBadge tone="gray">{r?.reference ?? `#${r?.id ?? ''}`}</ToneBadge>
        </div>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Client" icon={<UserRound size={18} />}>
          <KV k="Nom" v={clientName} />
          {r?.client?.telephone ? <KV k="Téléphone" v={r.client.telephone} /> : null}
          {r?.client?.email ? <KV k="Email" v={r.client.email} /> : null}
          {r?.client?.adresse ? <KV k="Adresse" v={r.client.adresse} /> : null}
          {r?.client?.pays ? <KV k="Pays" v={r.client.pays} /> : null}

          {onViewClientHistory && clientId ? (
            <div className="mt-3">
              <button
                type="button"
                className="btn bg-gray-200 dark:bg-white/10 w-full flex items-center justify-center gap-2"
                onClick={() => onViewClientHistory(Number(clientId), clientName)}
                title="Voir l’historique de ce client"
              >
                <History size={16} />
                Historique du client
              </button>
            </div>
          ) : null}
        </Card>

        <Card title="Résumé financier" icon={<BadgeCheck size={18} />}>
          <KV k="Nombre de personnes" v={r?.nombre_personnes ?? '—'} />
          <KV k="Sous-total" v={money(reservationSousTotal, 'XOF')} />
          <KV k="Taxes" v={money(reservationTaxes, 'XOF')} />
          <KV k="Total" v={money(reservationTotal, 'XOF')} />
        </Card>
      </div>

      {/* Produit / Forfait */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Produit" icon={<Receipt size={18} />}>
          <KV k="Produit" v={r?.produit?.nom || (r?.produit_id ? `#${r.produit_id}` : '—')} />
          {r?.produit?.type ? <KV k="Type produit" v={r.produit.type} /> : null}
          {r?.produit?.prix_base != null ? <KV k="Prix de base" v={money(r.produit.prix_base, 'XOF')} /> : null}
        </Card>

        <Card title="Forfait" icon={<Ticket size={18} />}>
          <KV k="Forfait" v={r?.forfait?.nom || (r?.forfait_id ? `#${r.forfait_id}` : '—')} />
          {r?.forfait?.type ? <KV k="Type" v={r.forfait.type} /> : null}
          {r?.forfait?.prix != null ? <KV k="Prix" v={money(r.forfait.prix, 'XOF')} /> : null}
        </Card>
      </div>

      {/* Flight details */}
      {r?.type === 'billet_avion' && (
        <Card title="Détails du vol" icon={<Plane size={18} />}>
          <KV k="Départ" v={vol.ville_depart ?? '—'} />
          <KV k="Arrivée" v={vol.ville_arrivee ?? '—'} />
          <KV k="Date départ" v={vol.date_depart ? new Date(vol.date_depart).toLocaleDateString() : '—'} />
          <KV k="Date arrivée" v={vol.date_arrivee ? new Date(vol.date_arrivee).toLocaleDateString() : '—'} />
          <KV k="Compagnie" v={vol.compagnie ?? '—'} />
          {vol.pnr ? <KV k="PNR" v={vol.pnr} /> : null}
          {vol.classe ? <KV k="Classe" v={vol.classe} /> : null}
        </Card>
      )}

      {/* Participants */}
      {participants.length > 0 && (
        <Card title="Participants" icon={<Users size={18} />}>
          <div className="space-y-2">
            {participants.map((p: any, idx: number) => (
              <div key={p.id ?? idx} className="rounded-xl border border-black/5 dark:border-white/10 p-3">
                <div className="font-medium">
                  {[(p.prenom || '').trim(), (p.nom || '').trim()].filter(Boolean).join(' ') || `Participant #${idx + 1}`}
                </div>
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {p.age != null ? <div>Âge : {p.age}</div> : null}
                  {p.remarques ? <div>Remarques : {p.remarques}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Factures + Historique paiements */}
      <Card title="Factures & Paiements" icon={<CalendarClock size={18} />}>
        {factures.length === 0 ? (
          <div className="text-sm text-gray-500">Aucune facture liée à cette réservation.</div>
        ) : (
          <div className="space-y-3">
            {factures.map((f: any) => {
              const factureId = Number(f?.id)
              const busy = busyInvoiceId === factureId

              const devise = f?.devise || 'XOF'
              const paiements = Array.isArray(f?.paiements) ? f.paiements : []
              const total = Number(f?.montant_total ?? f?.montant_ttc ?? f?.total ?? 0) || 0
              const paid = sumPaid(paiements)
              const remaining = Math.max(0, total - paid)
              const pct = total > 0 ? clamp((paid / total) * 100, 0, 100) : 0

              const paymentTone = remaining <= 0 ? 'green' : paid > 0 ? 'amber' : 'gray'
              const paymentLabel = remaining <= 0 ? 'Payée' : paid > 0 ? 'Partiellement payée' : 'Non payée'

              const factureTone =
                f?.statut === 'annule' ? 'red' : f?.statut === 'emis' || f?.statut === 'emise' ? 'green' : 'amber'

              // tri paiement (plus récent en haut)
              const sortedPayments = [...paiements].sort((a, b) => {
                const da = new Date(a?.date_paiement || a?.created_at || 0).getTime()
                const db = new Date(b?.date_paiement || b?.created_at || 0).getTime()
                return db - da
              })

              return (
                <div key={f.id} className="rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                  {/* Header facture */}
                  <div className="p-3 sm:p-4 bg-black/[0.02] dark:bg-white/[0.04]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold truncate">
                            {f.numero || `Facture #${f.id}`}
                          </div>
                          <ToneBadge tone={factureTone}>{f.statut ?? '—'}</ToneBadge>
                          <ToneBadge tone={paymentTone}>{paymentLabel}</ToneBadge>
                        </div>

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center justify-between gap-3 rounded-xl bg-white/70 dark:bg-black/10 px-3 py-2">
                            <span>Date</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {f?.date_facture ? new Date(f.date_facture).toLocaleDateString() : '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-xl bg-white/70 dark:bg-black/10 px-3 py-2">
                            <span>Total</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{money(total, devise)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-xl bg-white/70 dark:bg-black/10 px-3 py-2">
                            <span>Payé</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{money(paid, devise)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-xl bg-white/70 dark:bg-black/10 px-3 py-2">
                            <span>Reste</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {money(remaining, devise)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <ProgressBar value={pct} />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 sm:justify-end">
                        <button
                          type="button"
                          className="btn bg-gray-200 dark:bg-white/10 flex items-center gap-2"
                          disabled={busy || !factureId}
                          onClick={() => handleGeneratePdf(factureId)}
                          title="Générer le PDF"
                        >
                          <FilePlus2 size={16} />
                          Générer
                        </button>

                        <button
                          type="button"
                          className="btn-primary flex items-center gap-2"
                          disabled={busy || !factureId}
                          onClick={() => handleDownloadPdf(f)}
                          title="Télécharger la facture"
                        >
                          <Download size={16} />
                          Télécharger
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Historique paiements */}
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 font-semibold">
                      <CreditCard size={16} />
                      <span>Historique des paiements</span>
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        ({sortedPayments.length})
                      </span>
                    </div>

                    {sortedPayments.length === 0 ? (
                      <div className="mt-2 text-sm text-gray-500">Aucun paiement enregistré.</div>
                    ) : (
                      <div
                        className={[
                          'mt-3 rounded-xl border border-black/5 dark:border-white/10',
                          'overflow-hidden',
                        ].join(' ')}
                      >
                        {/* header */}
                        <div className="grid grid-cols-[1fr_120px] sm:grid-cols-[160px_1fr_140px] gap-3 px-3 py-2 text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-400 bg-black/[0.03] dark:bg-white/[0.06]">
                          <div className="hidden sm:block">Date</div>
                          <div>Mode / Référence</div>
                          <div className="text-right">Montant</div>
                        </div>

                        {/* list scrollable (anti débordement) */}
                        <div className="max-h-56 overflow-auto">
                          {sortedPayments.map((p: any) => {
                            const dt = safeDate(p.date_paiement || p.created_at)
                            const mode = p.mode_paiement ?? '—'
                            const ref = p.reference ? String(p.reference) : ''
                            const st = String(p.statut || '').toLowerCase()
                            const ok = st === 'recu' || st === 'reçu' || st === 'paye' || st === 'payé'

                            return (
                              <div
                                key={p.id}
                                className="grid grid-cols-[1fr_120px] sm:grid-cols-[160px_1fr_140px] gap-3 px-3 py-2 text-xs border-t border-black/5 dark:border-white/10"
                              >
                                <div className="hidden sm:block text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                  {dt}
                                </div>

                                <div className="min-w-0">
                                  {/* mobile date */}
                                  <div className="sm:hidden text-[11px] text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                    {dt}
                                  </div>

                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="truncate font-medium">{mode}</span>
                                    {ref ? (
                                      <span className="truncate text-gray-600 dark:text-gray-400">• {ref}</span>
                                    ) : null}
                                  </div>

                                  <div className="mt-1">
                                    <ToneBadge tone={ok ? 'green' : 'gray'}>{p.statut ?? '—'}</ToneBadge>
                                  </div>
                                </div>

                                <div className="text-right font-semibold whitespace-nowrap">
                                  {money(p.montant, devise)}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {busy ? <div className="mt-2 text-xs text-gray-500">Traitement…</div> : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Notes */}
      {r?.notes ? (
        <Card title="Notes" icon={<Info size={18} />}>
          <div className="whitespace-pre-wrap">{r.notes}</div>
        </Card>
      ) : null}
    </div>
  )
}
