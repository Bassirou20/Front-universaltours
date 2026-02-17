// src/features/reservations/ReservationDetails.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/axios'
import { useToast } from '../../ui/Toasts'
import {
  Plane,
  Hotel,
  Car,
  PartyPopper,
  Package,
  User,
  Users,
  Receipt,
  FileText,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe,
  ClipboardList,
  BadgeCheck,
  BadgeAlert,
  Info,
  Download,
  CreditCard,
  Zap,
} from 'lucide-react'

type Props = {
  reservation: any
  onViewClientHistory?: (clientId: number, label?: string) => void
}

/* -------------------- UI helpers -------------------- */
function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ')
}

const money = (n: any, devise = 'XOF') => `${Number(n || 0).toLocaleString()} ${devise}`

function safeDateTime(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleString()
}

function safeDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString()
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
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

function ToneBadge({
  tone,
  children,
}: {
  tone: 'gray' | 'green' | 'amber' | 'red' | 'blue'
  children: React.ReactNode
}) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap'
  const cls =
    tone === 'green'
      ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
      : tone === 'amber'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
      : tone === 'red'
      ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
      : tone === 'blue'
      ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
      : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200'
  return <span className={`${base} ${cls}`}>{children}</span>
}

function normalizeStatut(s: any) {
  const v = String(s || '').trim().toLowerCase()
  if (v === 'confirmée') return 'confirmee'
  if (v === 'annulée') return 'annulee'
  return v
}

function normalizeTypeKey(t: any) {
  // backend can return: "billet_avion", "billet avion", "Billet d'avion", etc.
  const raw = String(t || '').trim().toLowerCase()
  if (!raw) return 'billet_avion'
  const v = raw
    .replace(/['’]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')

  // common aliases
  if (v.includes('billet') && v.includes('avion')) return 'billet_avion'
  if (v.includes('evenement') || v.includes('event')) return 'evenement'
  if (v.includes('forfait') || v.includes('package')) return 'forfait'
  if (v.includes('hotel')) return 'hotel'
  if (v.includes('voiture') || v.includes('car')) return 'voiture'

  return v
}

function normalizeArray<T>(input: any): T[] {
  if (!input) return []
  if (Array.isArray(input)) return input as T[]
  if (Array.isArray(input?.data)) return input.data as T[]
  if (Array.isArray(input?.items)) return input.items as T[]
  return []
}

function StatutBadge({ statut }: { statut: any }) {
  const v = normalizeStatut(statut)
  const label =
    v === 'confirmee'
      ? 'Confirmée'
      : v === 'annulee'
      ? 'Annulée'
      : v === 'brouillon'
      ? 'Brouillon'
      : v === 'en_attente'
      ? 'En attente'
      : statut || '—'

  const tone =
    v === 'confirmee'
      ? 'green'
      : v === 'annulee'
      ? 'red'
      : v === 'brouillon'
      ? 'gray'
      : 'amber'

  return <ToneBadge tone={tone as any}>{label}</ToneBadge>
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; tone: 'blue' | 'gray' | 'amber' | 'green' }> =
  {
    billet_avion: { label: "Billet d'avion", icon: <Plane size={16} />, tone: 'blue' },
    hotel: { label: 'Hôtel', icon: <Hotel size={16} />, tone: 'green' },
    voiture: { label: 'Voiture', icon: <Car size={16} />, tone: 'amber' },
    evenement: { label: 'Événement', icon: <PartyPopper size={16} />, tone: 'blue' },
    forfait: { label: 'Forfait', icon: <Package size={16} />, tone: 'green' },
  }

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

  const sorted = [...arr].sort((a, b) => {
    const da = new Date(a?.created_at || a?.date_facture || 0).getTime()
    const db = new Date(b?.created_at || b?.date_facture || 0).getTime()
    return db - da
  })
  return sorted[0] ?? null
}

function computePay(r: any) {
  const f = pickLatestInvoice(r)
  const total =
    Number(
      f?.total ??
        f?.total_ttc ??
        f?.montant_total ??
        f?.montant_ttc ??
        f?.total_amount ??
        r?.montant_total ??
        0
    ) || 0

  const paiementsRaw = f?.paiements ?? r?.paiements ?? []
  const paiements: any[] = Array.isArray(paiementsRaw)
    ? paiementsRaw
    : Array.isArray(paiementsRaw?.data)
    ? paiementsRaw.data
    : Array.isArray(paiementsRaw?.items)
    ? paiementsRaw.items
    : []

  const paid = paiements.reduce((sum, p) => {
    const st = normalizeStatut(p?.statut)
    const montant = Number(p?.montant ?? 0) || 0
    if (!p?.statut) return sum + montant
    if (st === 'recu' || st === 'reçu') return sum + montant
    return sum
  }, 0)

  const remaining = Math.max(0, total - paid)
  const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((paid / total) * 100))) : 0

  const label = paid <= 0 ? 'Non payé' : total > 0 && paid >= total ? 'Payé' : 'Partiel'
  const tone: 'gray' | 'amber' | 'green' = paid <= 0 ? 'gray' : total > 0 && paid >= total ? 'green' : 'amber'

  return { total, paid, remaining, percent, label, tone, facture: f, paiements }
}

/* -------------------- Main -------------------- */
export function ReservationDetails({ reservation, onViewClientHistory }: Props) {
  const toast = useToast()

  // ✅ copie locale pour pouvoir refresh après actions rapides
  const [data, setData] = useState<any>(reservation)
  useEffect(() => setData(reservation), [reservation])

  const [busy, setBusy] = useState(false)
  const [busyInvoiceId, setBusyInvoiceId] = useState<number | null>(null)

  const r = data
  const typeKey = normalizeTypeKey(r?.type)
  const typeMeta = TYPE_META[typeKey] ?? { label: typeKey, icon: <ClipboardList size={16} />, tone: 'gray' as const }

  const client = r?.client ?? null
  const devise = String(r?.devise || 'XOF')

  const pay = useMemo(() => computePay(r), [r])
  const flight = r?.flight_details ?? r?.flightDetails ?? null

  // passager / bénéficiaire (billet avion)
  // Backends peuvent renvoyer:
  // - passenger_is_client (bool)
  // - passenger { prenom, nom, ... }
  // - passenger_name / beneficiary_name
  // - ou rien (=> client bénéficiaire par défaut)
  const passengerIsClient =
    typeof r?.passenger_is_client === 'boolean'
      ? r.passenger_is_client
      : typeof r?.passenger_is_client === 'number'
      ? !!r.passenger_is_client
      : false

  const passenger = useMemo(() => {
    const p =
      r?.passenger ??
      r?.beneficiaire ??
      r?.beneficiary ??
      r?.passager ??
      null

    // si objet vide -> null
    if (p && typeof p === 'object') {
      const hasName = !!([p?.prenom, p?.nom, p?.name, p?.full_name].filter(Boolean).join(' ').trim())
      if (!hasName) return null
      return p
    }
    return null
  }, [r?.passenger, r?.beneficiaire, r?.beneficiary, r?.passager])

  const passengerName = useMemo(() => {
    if (typeKey !== 'billet_avion') return null

    // 1) string direct du backend
    const direct =
      (r?.passenger_name ?? r?.beneficiary_name ?? r?.beneficiaire_nom ?? null) as any
    if (direct && String(direct).trim()) return String(direct).trim()

    // 2) objet passenger
    if (passenger) {
      const n = [passenger?.prenom, passenger?.nom].filter(Boolean).join(' ').trim()
      if (n) return n
      if (passenger?.name) return String(passenger.name)
      if (passenger?.full_name) return String(passenger.full_name)
    }

    // 3) fallback client
    const n = [client?.prenom, client?.nom].filter(Boolean).join(' ').trim()
    return n || client?.nom || null
  }, [typeKey, r?.passenger_name, r?.beneficiary_name, r?.beneficiaire_nom, passenger, client?.prenom, client?.nom, client?.nom])

  const headerRef = r?.reference ?? `#${r?.id ?? '—'}`

  const refreshReservation = async () => {
    const id = Number(r?.id)
    if (!id) return
    setBusy(true)
    try {
      const res = await api.get(`/reservations/${id}`)
      setData(res.data?.data ?? res.data)
    } catch {
      // on ne bloque pas
    } finally {
      setBusy(false)
    }
  }

  const downloadDevisPdf = async () => {
    const id = Number(r?.id)
    if (!id) return
    try {
      const res = await api.get(`/reservations/${id}/devis-pdf`, { responseType: 'blob' })
      const filename = `devis-${headerRef}.pdf`.replace(/[^\w\-\.]+/g, '_')
      downloadBlob(res.data, filename)
      toast.push({ title: 'Devis téléchargé', tone: 'success' })
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Impossible de générer le devis.'
      toast.push({ title: msg, tone: 'error' })
    }
  }

  const downloadFacturePdf = async (factureId: number, numero?: string) => {
    const filename = `${numero || `facture-${factureId}`}.pdf`.replace(/[^\w\-\.]+/g, '_')
    try {
      const res = await api.get(`/factures/${factureId}/pdf`, { responseType: 'blob' })
      downloadBlob(res.data, filename)
      toast.push({ title: 'Facture téléchargée', tone: 'success' })
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'PDF indisponible.'
      toast.push({ title: msg, tone: 'error' })
    }
  }

  const ensureInvoice = async (): Promise<any | null> => {
    const reservationId = Number(r?.id)
    if (!reservationId) return null

    let facture = pickLatestInvoice(r)
    if (facture?.id) return facture

    const date_facture = new Date().toISOString().slice(0, 10)
    const created = await api.post(`/reservations/${reservationId}/factures`, { date_facture })
    facture = created?.data?.data ?? created?.data
    return facture?.id ? facture : null
  }

  const ensureAndDownloadInvoice = async () => {
    const reservationId = Number(r?.id)
    if (!reservationId) return

    setBusyInvoiceId(reservationId)
    try {
      const facture = await ensureInvoice()
      if (!facture?.id) {
        toast.push({ title: 'Aucune facture trouvée/créée.', tone: 'error' })
        return
      }
      await downloadFacturePdf(Number(facture.id), facture?.numero)
      await refreshReservation()
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Impossible de télécharger la facture.'
      toast.push({ title: msg, tone: 'error' })
    } finally {
      setBusyInvoiceId(null)
    }
  }

  // ✅ Action rapide: Émettre facture
  const emitInvoice = async () => {
    setBusy(true)
    try {
      const facture = await ensureInvoice()
      if (!facture?.id) {
        toast.push({ title: 'Impossible de créer la facture.', tone: 'error' })
        return
      }

      await api.post(`/factures/${facture.id}/emettre`)
      toast.push({ title: 'Facture émise', tone: 'success' })
      await refreshReservation()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Impossible d’émettre la facture (vérifie la route + méthode FactureController::emettre)."
      toast.push({ title: msg, tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  // ✅ Action rapide: Ajouter paiement
  const [payFormOpen, setPayFormOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    montant: 0,
    mode_paiement: 'especes',
    reference: '',
  })

  const addPayment = async () => {
    const montant = Number(paymentForm.montant || 0)
    if (montant <= 0) {
      toast.push({ title: 'Montant du paiement requis.', tone: 'error' })
      return
    }

    setBusy(true)
    try {
      const facture = await ensureInvoice()
      if (!facture?.id) {
        toast.push({ title: 'Impossible de créer la facture pour enregistrer le paiement.', tone: 'error' })
        return
      }

      await api.post(`/factures/${facture.id}/paiements`, {
        montant,
        mode_paiement: paymentForm.mode_paiement,
        reference: paymentForm.reference || null,
        statut: 'recu',
      })

      toast.push({ title: 'Paiement enregistré', tone: 'success' })
      setPaymentForm({ montant: 0, mode_paiement: 'especes', reference: '' })
      setPayFormOpen(false)
      await refreshReservation()
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Impossible d’enregistrer le paiement.'
      toast.push({ title: msg, tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const showProduit = !!r?.produit
  const showForfait = !!r?.forfait

  const participants = useMemo(() => normalizeArray<any>(r?.participants), [r?.participants])
  const showParticipants = typeKey === 'evenement' || typeKey === 'forfait'

  const topBadges = (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <ToneBadge tone={typeMeta.tone}>{typeMeta.label}</ToneBadge>
      <StatutBadge statut={r?.statut} />
      <ToneBadge tone={pay.tone}>
        {pay.label} • {pay.percent}%
      </ToneBadge>
      {r?.reference ? <ToneBadge tone="gray">{r.reference}</ToneBadge> : null}
    </div>
  )

  const totalsCard = (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
        <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
        <div className="text-lg font-semibold">{money(pay.total || r?.montant_total, devise)}</div>
      </div>
      <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
        <div className="text-xs text-gray-600 dark:text-gray-400">Payé</div>
        <div className="text-lg font-semibold">{money(pay.paid, devise)}</div>
      </div>
      <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
        <div className="text-xs text-gray-600 dark:text-gray-400">Reste</div>
        <div className="text-lg font-semibold">{money(pay.remaining, devise)}</div>
      </div>

      <div className="sm:col-span-3">
        <div className="text-xs text-gray-600 dark:text-gray-400">% payé</div>
        <div className="mt-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pay.percent}%` }} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header pro */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-gray-700 dark:text-gray-200">{typeMeta.icon}</span>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {r?.reference ? `Réservation ${r.reference}` : 'Détails de la réservation'}
              </div>
            </div>

            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-2">
              <span>Créée le {safeDateTime(r?.created_at)}</span>
              <span>•</span>
              <span>Mise à jour {safeDateTime(r?.updated_at)}</span>

              {typeKey === 'billet_avion' ? (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <User size={12} />
                    <span className="font-medium text-gray-800 dark:text-gray-200">Bénéficiaire:</span>{' '}
                    {passengerName || '—'}
                  </span>
                </>
              ) : null}

              {busy ? (
                <>
                  <span>•</span>
                  <span className="text-xs text-gray-500">Actualisation…</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="shrink-0">{topBadges}</div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={downloadDevisPdf} disabled={busy}>
            <FileText size={16} className="mr-2" />
            Devis (PDF)
          </button>

          <button
            type="button"
            className={cx('btn', 'bg-gray-200 dark:bg-white/10')}
            onClick={ensureAndDownloadInvoice}
            disabled={!!busyInvoiceId || busy}
            title="Télécharger la facture (création auto si manquante)"
          >
            <Download size={16} className="mr-2" />
            Facture (PDF)
          </button>

          {client?.id && onViewClientHistory ? (
            <button
              type="button"
              className="btn bg-gray-200 dark:bg-white/10"
              onClick={() =>
                onViewClientHistory(
                  Number(client.id),
                  [client?.prenom, client?.nom].filter(Boolean).join(' ') || client?.nom
                )
              }
              disabled={busy}
            >
              <Users size={16} className="mr-2" />
              Historique du client
            </button>
          ) : null}
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-4">
        {/* LEFT */}
        <div className="space-y-4">
          {/* Client */}
          <Card
            title="Client"
            icon={<User size={18} />}
            right={client?.id ? <ToneBadge tone="gray">#{client.id}</ToneBadge> : undefined}
          >
            {client ? (
              <div className="space-y-3">
                <KV label="Nom" value={[client?.prenom, client?.nom].filter(Boolean).join(' ') || client?.nom || '—'} />
                <KV
                  label="Téléphone"
                  value={
                    client?.telephone ? (
                      <span className="inline-flex items-center gap-2">
                        <Phone size={14} className="opacity-70" /> {client.telephone}
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
                <KV
                  label="Email"
                  value={
                    client?.email ? (
                      <span className="inline-flex items-center gap-2">
                        <Mail size={14} className="opacity-70" /> {client.email}
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
                <KV
                  label="Pays"
                  value={
                    client?.pays ? (
                      <span className="inline-flex items-center gap-2">
                        <Globe size={14} className="opacity-70" /> {client.pays}
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
              </div>
            ) : (
              <div className="text-sm text-gray-500">—</div>
            )}
          </Card>

          {/* Vol */}
          {typeKey === 'billet_avion' ? (
            <Card
              title="Détails du vol"
              icon={<Plane size={18} />}
              right={
                flight?.pnr ? (
                  <ToneBadge tone="blue">
                    PNR: <span className="ml-1 font-bold">{String(flight.pnr).toUpperCase()}</span>
                  </ToneBadge>
                ) : undefined
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Trajet</div>
                  <div className="mt-1 font-semibold flex items-center gap-2">
                    <MapPin size={16} className="opacity-70" />
                    <span className="truncate">
                      {flight?.ville_depart || '—'} → {flight?.ville_arrivee || '—'}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Compagnie</div>
                  <div className="mt-1 font-semibold">{flight?.compagnie || '—'}</div>
                </div>

                <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Départ</div>
                  <div className="mt-1 font-semibold inline-flex items-center gap-2">
                    <Calendar size={16} className="opacity-70" />
                    {safeDate(flight?.date_depart)}
                  </div>
                </div>

                <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Arrivée</div>
                  <div className="mt-1 font-semibold inline-flex items-center gap-2">
                    <Calendar size={16} className="opacity-70" />
                    {safeDate(flight?.date_arrivee)}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <KV label="Classe" value={flight?.classe || '—'} />
                </div>
              </div>
            </Card>
          ) : null}

          {/* Bénéficiaire / Passager */}
          {typeKey === 'billet_avion' ? (
            <Card
              title="Bénéficiaire du billet"
              icon={<User size={18} />}
              right={passengerIsClient ? <ToneBadge tone="gray">Client</ToneBadge> : undefined}
            >
              <div className="space-y-3">
                <KV label="Nom" value={passengerName || '—'} />
                {passenger && !passengerIsClient ? (
                  <>
                    {passenger?.passport ? <KV label="Passeport" value={passenger.passport} /> : null}
                    {passenger?.sexe ? <KV label="Sexe" value={passenger.sexe} /> : null}
                    {passenger?.telephone ? <KV label="Téléphone" value={passenger.telephone} /> : null}
                    {passenger?.email ? <KV label="Email" value={passenger.email} /> : null}
                  </>
                ) : null}

                {!passenger && passengerIsClient ? (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Bénéficiaire = client sélectionné pour cette réservation.
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          {/* Produit / Forfait */}
          {showProduit ? (
            <Card title="Produit" icon={<ClipboardList size={18} />}>
              <div className="space-y-2">
                <KV label="Nom" value={r?.produit?.nom || `Produit #${r?.produit?.id ?? '—'}`} />
                <KV label="Type" value={r?.produit?.type_label ?? r?.produit?.type ?? '—'} />
              </div>
            </Card>
          ) : null}

          {showForfait ? (
            <Card title="Forfait" icon={<Package size={18} />}>
              <div className="space-y-2">
                <KV label="Nom" value={r?.forfait?.nom || `Forfait #${r?.forfait?.id ?? '—'}`} />
                <KV label="Type" value={r?.forfait?.type ?? '—'} />
              </div>
            </Card>
          ) : null}

          {/* Participants */}
          {showParticipants ? (
            <Card title="Participants" icon={<Users size={18} />} right={<ToneBadge tone="gray">{participants.length}</ToneBadge>}>
              {participants.length === 0 ? (
                <div className="text-sm text-gray-500">Aucun participant enregistré pour cette réservation.</div>
              ) : (
                <div className="space-y-2">
                  {participants.map((p: any, idx: number) => {
                    const name = [p?.prenom, p?.nom].filter(Boolean).join(' ') || p?.nom || `Participant ${idx + 1}`
                    const subtitleParts: string[] = []
                    if (p?.passport) subtitleParts.push(`Passeport: ${p.passport}`)
                    if (p?.sexe) subtitleParts.push(`Sexe: ${p.sexe}`)
                    if (p?.age != null) subtitleParts.push(`Âge: ${p.age}`)
                    if (p?.telephone) subtitleParts.push(`Tél: ${p.telephone}`)

                    return (
                      <div
                        key={p?.id ?? idx}
                        className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{name}</div>
                          {subtitleParts.length ? (
                            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate">
                              {subtitleParts.join(' • ')}
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-gray-500">—</div>
                          )}
                        </div>
                        {p?.role ? <ToneBadge tone="gray">{p.role}</ToneBadge> : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          ) : null}

          {/* Notes */}
          {r?.notes ? (
            <Card title="Notes" icon={<Info size={18} />}>
              <div className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{r.notes}</div>
            </Card>
          ) : null}
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {/* Résumé financier */}
          <Card title="Résumé financier" icon={pay.percent >= 100 ? <BadgeCheck size={18} /> : <BadgeAlert size={18} />}>
            {totalsCard}
          </Card>

          {/* ✅ Actions rapides */}
          <Card title="Actions rapides" icon={<Zap size={18} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                className="btn bg-gray-200 dark:bg-white/10"
                onClick={emitInvoice}
                disabled={busy}
                title="Émettre la facture (si route disponible)"
              >
                <Receipt size={16} className="mr-2" />
                Émettre facture
              </button>

              <button
                type="button"
                className="btn bg-gray-200 dark:bg-white/10"
                onClick={() => setPayFormOpen((v) => !v)}
                disabled={busy}
              >
                <CreditCard size={16} className="mr-2" />
                Ajouter paiement
              </button>
            </div>

            {payFormOpen ? (
              <div className="mt-3 rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/10 p-3">
                <div className="text-sm font-semibold mb-2">Nouveau paiement</div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="label">Montant *</label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={paymentForm.montant}
                      onChange={(e) => setPaymentForm((s) => ({ ...s, montant: Number(e.target.value || 0) }))}
                    />
                  </div>

                  <div>
                    <label className="label">Mode</label>
                    <select
                      className="input"
                      value={paymentForm.mode_paiement}
                      onChange={(e) => setPaymentForm((s) => ({ ...s, mode_paiement: e.target.value }))}
                    >
                      <option value="especes">Espèces</option>
                      <option value="wave">Wave</option>
                      <option value="orange_money">Orange Money</option>
                      <option value="virement">Virement</option>
                      <option value="carte">Carte</option>
                      <option value="cheque">Chèque</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Référence</label>
                    <input
                      className="input"
                      value={paymentForm.reference}
                      onChange={(e) => setPaymentForm((s) => ({ ...s, reference: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="btn bg-gray-200 dark:bg-white/10"
                    onClick={() => setPayFormOpen(false)}
                    disabled={busy}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn bg-gray-900 text-white dark:bg-white dark:text-black"
                    onClick={addPayment}
                    disabled={busy}
                  >
                    Enregistrer paiement
                  </button>
                </div>

                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  Astuce: si aucune facture n’existe, elle sera créée automatiquement avant d’enregistrer le paiement.
                </div>
              </div>
            ) : null}
          </Card>

          {/* Factures & paiements */}
          <Card title="Factures & paiements" icon={<Receipt size={18} />}>
            {!pay.facture ? (
              <div className="text-sm text-gray-500 space-y-2">
                <div>Aucune facture liée (ou non incluse dans la réponse API).</div>
                <button
                  type="button"
                  className="btn bg-gray-200 dark:bg-white/10"
                  onClick={ensureAndDownloadInvoice}
                  disabled={!!busyInvoiceId || busy}
                >
                  <Receipt size={16} className="mr-2" />
                  Créer / télécharger la facture
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{pay.facture?.numero || `Facture #${pay.facture?.id}`}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Date: {safeDate(pay.facture?.date_facture || pay.facture?.created_at)}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn bg-gray-200 dark:bg-white/10"
                    onClick={() => downloadFacturePdf(Number(pay.facture.id), pay.facture?.numero)}
                    disabled={busy}
                  >
                    <Download size={16} className="mr-2" />
                    PDF
                  </button>
                </div>

                {Array.isArray(pay.paiements) && pay.paiements.length > 0 ? (
                  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/10">
                    <div className="px-3 py-2 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                      <div className="text-sm font-semibold inline-flex items-center gap-2">
                        <CreditCard size={16} /> Paiements
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {pay.paiements.length} entrée{pay.paiements.length > 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="max-h-[44vh] overflow-y-auto p-3 space-y-2">
                      {[...pay.paiements]
                        .sort(
                          (a: any, b: any) =>
                            +new Date(b?.date_paiement || b?.created_at || 0) -
                            +new Date(a?.date_paiement || a?.created_at || 0)
                        )
                        .map((p: any) => {
                          const st = normalizeStatut(p?.statut)
                          const ok = !p?.statut || st === 'recu' || st === 'reçu'
                          const ref = p?.reference ? String(p.reference) : null
                          return (
                            <div
                              key={p?.id || `${p?.mode_paiement}-${p?.created_at}`}
                              className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] px-3 py-2"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">
                                    {p?.mode_paiement ?? '—'}{' '}
                                    {ref ? <span className="text-xs text-gray-600 dark:text-gray-400">({ref})</span> : null}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {safeDate(p?.date_paiement || p?.created_at)}
                                  </div>
                                  <div className="mt-1">
                                    <ToneBadge tone={ok ? 'green' : 'gray'}>{p?.statut ?? '—'}</ToneBadge>
                                  </div>
                                </div>

                                <div className="text-right font-semibold whitespace-nowrap">{money(p?.montant, devise)}</div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Aucun paiement enregistré.</div>
                )}
              </div>
            )}
          </Card>

          {/* Infos techniques */}
          <Card title="Infos" icon={<Info size={18} />}>
            <div className="space-y-2">
              <KV label="ID" value={r?.id ?? '—'} />
              <KV label="Référence" value={headerRef} />
              <KV label="Type" value={typeMeta.label} />
              <KV label="Statut" value={<StatutBadge statut={r?.statut} />} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
