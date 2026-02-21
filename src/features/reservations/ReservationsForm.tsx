// src/features/reservations/ReservationsForm.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
} from 'lucide-react'

export type ReservationType = 'billet_avion' | 'hotel' | 'voiture' | 'evenement' | 'forfait'

export type ReservationInput = {
  id?: number

  // Client
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

  // Commun
  type: ReservationType
  statut?: string
  reference?: string | null
  nombre_personnes?: number
  montant_sous_total?: number | null
  montant_taxes?: number | null
  montant_total?: number
  notes?: string | null

  // Billet avion (store)
  passenger_is_client?: boolean
  passenger?: {
    nom: string
    prenom?: string
  }
  flight_details?: {
    ville_depart: string
    ville_arrivee: string
    date_depart: string
    date_arrivee?: string | null
    compagnie?: string | null
    pnr?: string | null
    classe?: string | null
  }

  // Billet avion (update backend attend à plat)
  ville_depart?: string | null
  ville_arrivee?: string | null
  date_depart?: string | null
  date_arrivee?: string | null
  compagnie?: string | null
  pnr?: string | null
  classe?: string | null

  // Autres
  produit_id?: number | null
  forfait_id?: number | null

  // Participants (events / forfaits)
  participants?: Array<{
    nom: string
    prenom?: string
    passport?: string
    age?: number | null
    remarques?: string
    role?: string
  }>

  // acompte front-only
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

/* -------------------- UI helpers -------------------- */
function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ')
}

function money(n: any, devise = 'XOF') {
  return `${Number(n || 0).toLocaleString()} ${devise}`
}

function extractList(data: any): any[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data?.data)) return data.data.data
  if (Array.isArray(data?.result)) return data.result
  return []
}

const TYPE_META: Record<ReservationType, { label: string; icon: React.ReactNode; hint: string }> = {
  billet_avion: { label: "Billet d'avion", icon: <Plane size={16} />, hint: 'Vol + passager + PNR optionnel.' },
  hotel: { label: 'Hôtel', icon: <Hotel size={16} />, hint: 'Produit hôtel + montant.' },
  voiture: { label: 'Location voiture', icon: <Car size={16} />, hint: '1 réservation = 1 personne (fixé).' },
  evenement: { label: 'Évènement', icon: <PartyPopper size={16} />, hint: 'Participants optionnels selon besoin.' },
  forfait: { label: 'Forfait', icon: <Package size={16} />, hint: 'Forfait + participants.' },
}

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
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Étape {current + 1} / {steps.length}
        </div>
      </div>

      <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {steps.map((s, i) => {
          const active = i === current
          const done = i < current
          return (
            <button
              key={i}
              type="button"
              onClick={() => onGo?.(i)}
              className={cx(
                'rounded-2xl border px-3 py-2 text-left transition',
                active
                  ? 'border-primary bg-primary/5'
                  : 'border-black/10 dark:border-white/10 bg-white dark:bg-panel hover:bg-black/[0.02] dark:hover:bg-white/[0.04]'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className={cx('text-sm font-medium', active ? 'text-primary' : 'text-gray-900 dark:text-gray-100')}>
                  {s.title}
                </div>
                {done ? <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" /> : null}
              </div>
              {s.subtitle ? <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{s.subtitle}</div> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft">
      <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center gap-2">
        {icon ? <span className="text-gray-700 dark:text-gray-200">{icon}</span> : null}
        <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

/* -------------------- Main -------------------- */
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
  produit_id: null,
  forfait_id: null,
  participants: [],
  acompte: { montant: 0, mode_paiement: 'especes', reference: '' },
}

function normalizeReservationToForm(dv?: Partial<ReservationInput>): ReservationInput {
  const v: any = dv || {}
  const type: ReservationType = (v.type as ReservationType) || 'billet_avion'

  const clientId = v.client_id ?? v.client?.id ?? null

  // backend show(): flightDetails + reservation columns ville_depart...
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

  // passenger: show() renvoie passenger (Participant) ou passenger_id
  const passengerBackend = v.passenger ?? null
  const passenger_is_client =
    typeof v.passenger_is_client === 'boolean'
      ? v.passenger_is_client
      : passengerBackend
      ? false
      : true

  const passenger =
    type === 'billet_avion' && !passenger_is_client
      ? {
          nom: String(passengerBackend?.nom ?? v.passenger_nom ?? ''),
          prenom: String(passengerBackend?.prenom ?? v.passenger_prenom ?? ''),
        }
      : { nom: '', prenom: '' }

  const participantsArr = Array.isArray(v.participants) ? v.participants : []
  const participants =
    type === 'forfait' || type === 'evenement'
      ? participantsArr.map((p: any) => ({
          nom: String(p?.nom ?? ''),
          prenom: p?.prenom ?? '',
          passport: p?.passport ?? '',
          age: p?.age ?? null,
          remarques: p?.remarques ?? '',
          role: p?.role ?? 'passenger',
        }))
      : []

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
    passenger,
    flight_details,

    // garder aussi les champs à plat (utile update)
    ville_depart: v.ville_depart ?? flight_details?.ville_depart ?? null,
    ville_arrivee: v.ville_arrivee ?? flight_details?.ville_arrivee ?? null,
    date_depart: v.date_depart ?? flight_details?.date_depart ?? null,
    date_arrivee: v.date_arrivee ?? (flight_details?.date_arrivee as any) ?? null,
    compagnie: v.compagnie ?? (flight_details?.compagnie as any) ?? null,
    pnr: v.pnr ?? (flight_details?.pnr as any) ?? null,
    classe: v.classe ?? (flight_details?.classe as any) ?? null,

    produit_id: v.produit_id != null ? Number(v.produit_id) : null,
    forfait_id: v.forfait_id != null ? Number(v.forfait_id) : null,

    participants,

    acompte: {
      montant: Number(v.acompte?.montant ?? 0),
      mode_paiement: String(v.acompte?.mode_paiement ?? 'especes'),
      reference: String(v.acompte?.reference ?? ''),
    },
  }
}

export function ReservationsForm({ defaultValues, submitting, onCancel, onSubmit }: Props) {
  const isEdit = Boolean((defaultValues as any)?.id)

  const [form, setForm] = useState<ReservationInput>(() => normalizeReservationToForm(defaultValues))
  const [step, setStep] = useState(0)
  const [clientSearch, setClientSearch] = useState('')

  useEffect(() => {
    setForm(normalizeReservationToForm(defaultValues))
    setStep(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues || {})])

  /* ---------- Data sources (selects) ---------- */
  const qClients = useQuery({
  queryKey: ['clients', 'select-all'],
  queryFn: async () => {
    const all: any[] = []
    const seen = new Set<number>()

    let page = 1
    const PER_PAGE = 200
    const MAX_PAGES = 200 // sécurité
    const MAX_ITEMS = 20000 // sécurité

    for (let i = 0; i < MAX_PAGES; i++) {
      // On tente plusieurs noms de params au cas où ton backend n'accepte pas per_page
      const { data } = await api.get('/clients', {
        params: { page, per_page: PER_PAGE, perPage: PER_PAGE, limit: PER_PAGE },
      })

      const list = extractList(data)
      if (!list.length) break

      // Ajout + dédup
      let newCount = 0
      for (const c of list) {
        const id = Number(c?.id)
        if (!id) continue
        if (seen.has(id)) continue
        seen.add(id)
        all.push(c)
        newCount++
      }

      // Si la page n'apporte rien de nouveau -> stop (évite boucle infinie)
      if (newCount === 0) break

      // Heuristique: si on reçoit moins que PER_PAGE, on est probablement à la fin
      if (list.length < PER_PAGE) break

      // Limite globale
      if (all.length >= MAX_ITEMS) break

      page += 1
    }

    return all
  },
})

  const qProduits = useQuery({
    queryKey: ['produits', 'select-all'],
    queryFn: async () => {
      const { data } = await api.get('/produits', { params: { per_page: 300 } })
      const list = extractList(data)
      return list
    },
  })

  const qForfaits = useQuery({
    queryKey: ['forfaits', 'select-all'],
    queryFn: async () => {
      const { data } = await api.get('/forfaits', { params: { per_page: 300 } })
      const list = extractList(data)
      return list
    },
  })

  const clients: any[] = qClients.data || []
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) => {
      const name = [c?.prenom, c?.nom].filter(Boolean).join(' ').toLowerCase()
      const phone = String(c?.telephone || '').toLowerCase()
      const email = String(c?.email || '').toLowerCase()
      return name.includes(q) || phone.includes(q) || email.includes(q)
    })
  }, [clients, clientSearch])

  const produits: any[] = qProduits.data || []
  const forfaits: any[] = qForfaits.data || []

  const produitsOfType = useMemo(() => {
    if (!form.type) return []
    return produits.filter((p) => String(p?.type) === String(form.type))
  }, [produits, form.type])

  const selectedClient = useMemo(() => {
    if (!form.client_id) return null
    return clients.find((c) => Number(c?.id) === Number(form.client_id)) || null
  }, [clients, form.client_id])

  /* ---------- Step definitions ---------- */
  const steps = useMemo(
    () => [
      { title: 'Type & client', subtitle: 'Choisir le type + le payeur' },
      { title: 'Détails', subtitle: 'Vol / produit / forfait' },
      { title: 'Bénéficiaire', subtitle: 'Passager / participants' },
      { title: 'Montant', subtitle: 'Total + notes' },
      { title: 'Acompte', subtitle: 'Optionnel' },
    ],
    []
  )

  /* ---------- Generic setters ---------- */
  const set = <K extends keyof ReservationInput>(key: K, value: ReservationInput[K]) => {
    setForm((s) => ({ ...s, [key]: value }))
  }

  const setFlight = (patch: Partial<NonNullable<ReservationInput['flight_details']>>) => {
    setForm((s) => {
      const next = {
        ...s,
        flight_details: { ...(s.flight_details || (EMPTY.flight_details as any)), ...patch },
      }
      // garder sync à plat (utile update)
      if (next.type === 'billet_avion' && next.flight_details) {
        next.ville_depart = next.flight_details.ville_depart
        next.ville_arrivee = next.flight_details.ville_arrivee
        next.date_depart = next.flight_details.date_depart
        next.date_arrivee = (next.flight_details.date_arrivee as any) ?? ''
        next.compagnie = next.flight_details.compagnie ?? ''
        next.pnr = next.flight_details.pnr ?? ''
        next.classe = next.flight_details.classe ?? ''
      }
      return next
    })
  }

  const setPassenger = (patch: Partial<NonNullable<ReservationInput['passenger']>>) => {
    setForm((s) => ({
      ...s,
      passenger: { ...(s.passenger || { nom: '', prenom: '' }), ...patch } as any,
    }))
  }

  const addParticipant = () => {
    setForm((s) => ({
      ...s,
      participants: [...(s.participants || []), { nom: '', prenom: '', passport: '', age: null, remarques: '', role: 'passenger' }],
    }))
  }

  const updateParticipant = (idx: number, patch: any) => {
    setForm((s) => ({
      ...s,
      participants: (s.participants || []).map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }))
  }

  const removeParticipant = (idx: number) => {
    setForm((s) => ({ ...s, participants: (s.participants || []).filter((_, i) => i !== idx) }))
  }

  /* ---------- Business rules ---------- */
  useEffect(() => {
    if (form.type === 'voiture' && form.nombre_personnes !== 1) {
      set('nombre_personnes', 1)
    }
    if (form.type === 'billet_avion' && (form.nombre_personnes ?? 1) < 1) {
      set('nombre_personnes', 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type])

  /* ---------- Validation minimal (wizard) ---------- */
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (form.client_mode === 'existing' && !form.client_id) return 'Veuillez sélectionner un client.'
      if (form.client_mode === 'new') {
        if (!form.client?.nom) return 'Nom du client requis.'
        if (!form.client?.telephone && !form.client?.email) return 'Téléphone ou email du client requis.'
      }
      if (!form.type) return 'Type requis.'
    }

    if (s === 1) {
      if (form.type === 'billet_avion') {
        const fd = form.flight_details
        if (!fd?.ville_depart) return 'Ville départ requise.'
        if (!fd?.ville_arrivee) return 'Ville arrivée requise.'
        if (!fd?.date_depart) return 'Date départ requise.'
      } else if (form.type === 'forfait') {
        if (!form.forfait_id) return 'Veuillez sélectionner un forfait.'
      } else {
        if (!form.produit_id) return 'Veuillez sélectionner un produit.'
      }
    }

    if (s === 2) {
      if (form.type === 'billet_avion') {
        if (!form.passenger_is_client) {
          if (!form.passenger?.nom) return 'Nom du passager requis.'
        }
      }
    }

    if (s === 3) {
      if (form.type === 'billet_avion') {
        if (Number(form.montant_sous_total || 0) <= 0) return 'Achat (hors fees) requis.'
        if (Number(form.montant_taxes || 0) < 0) return 'Fees invalides.'
      } else {
        if (Number(form.montant_total || 0) <= 0) return 'Montant total requis.'
      }
    }

    return null
  }

  const canGoNext = validateStep(step) === null

  const next = () => {
    const err = validateStep(step)
    if (err) return
    setStep((v) => Math.min(v + 1, steps.length - 1))
  }

  const prev = () => setStep((v) => Math.max(v - 1, 0))

  /* ---------- Submit mapping to backend ---------- */
  const buildPayload = (): ReservationInput => {
    const payload: any = { ...form }

    // client mode
    if (payload.client_mode === 'existing') {
      delete payload.client
    } else {
      delete payload.client_id
    }
    delete payload.client_mode

    // --- billet avion ---
    if (payload.type === 'billet_avion') {
      // clean flight details
      const fd = {
        ville_depart: String(payload.flight_details?.ville_depart || '').trim(),
        ville_arrivee: String(payload.flight_details?.ville_arrivee || '').trim(),
        date_depart: String(payload.flight_details?.date_depart || '').trim(),
        date_arrivee: payload.flight_details?.date_arrivee ? String(payload.flight_details.date_arrivee) : '',
        compagnie: payload.flight_details?.compagnie ? String(payload.flight_details.compagnie) : '',
        pnr: payload.flight_details?.pnr ? String(payload.flight_details.pnr) : null,
        classe: payload.flight_details?.classe ? String(payload.flight_details.classe) : null,
      }

      if (isEdit) {
        // ✅ UPDATE: ton UpdateReservationRequest attend des champs à plat
        payload.ville_depart = fd.ville_depart
        payload.ville_arrivee = fd.ville_arrivee
        payload.date_depart = fd.date_depart
        payload.date_arrivee = fd.date_arrivee
        payload.compagnie = fd.compagnie
        payload.pnr = fd.pnr
        payload.classe = fd.classe

        // on ne poste pas flight_details / passenger en update
        delete payload.flight_details
        delete payload.passenger_is_client
        delete payload.passenger
      } else {
        // ✅ CREATE: backend attend flight_details + passenger_is_client/passenger
        payload.flight_details = {
          ville_depart: fd.ville_depart,
          ville_arrivee: fd.ville_arrivee,
          date_depart: fd.date_depart,
          date_arrivee: fd.date_arrivee || null,
          compagnie: fd.compagnie || null,
          pnr: fd.pnr,
          classe: fd.classe,
        }

        if (payload.passenger_is_client) {
          delete payload.passenger
        } else {
          payload.passenger = {
            nom: String(payload.passenger?.nom || '').trim(),
            prenom: String(payload.passenger?.prenom || '').trim() || undefined,
          }
        }
      }
    } else {
      // not billet_avion
      delete payload.passenger_is_client
      delete payload.passenger
      delete payload.flight_details

      // remove flat flight keys
      delete payload.ville_depart
      delete payload.ville_arrivee
      delete payload.date_depart
      delete payload.date_arrivee
      delete payload.compagnie
      delete payload.pnr
      delete payload.classe
    }

    // produit/forfait rules
    if (payload.type === 'forfait') {
      delete payload.produit_id
    } else if (payload.type !== 'forfait' && payload.type !== 'billet_avion') {
      delete payload.forfait_id
    } else if (payload.type === 'billet_avion') {
      // billet avion: pas de produit/forfait
      delete payload.produit_id
      delete payload.forfait_id
    }

    // participants
    const shouldHaveParticipants = payload.type === 'forfait' || payload.type === 'evenement'
    if (!shouldHaveParticipants) delete payload.participants
    else payload.participants = (payload.participants || []).filter((p: any) => String(p?.nom || '').trim() !== '')

    // Montants
    payload.nombre_personnes = Number(payload.nombre_personnes || 1)

    if (payload.type === 'billet_avion') {
      const st = payload.montant_sous_total == null ? 0 : Number(payload.montant_sous_total)
      const tx = payload.montant_taxes == null ? 0 : Number(payload.montant_taxes)
      payload.montant_sous_total = st
      payload.montant_taxes = tx
      // compat: on envoie un total cohérent (le backend peut recalculer)
      payload.montant_total = st + tx
    } else {
      payload.montant_total = Number(payload.montant_total || 0)
      delete payload.montant_sous_total
      delete payload.montant_taxes
    }

    // acompte: front-only (géré par ReservationsPage)
    return payload as ReservationInput
  }

  const onFinalSubmit = () => {
    for (let i = 0; i < steps.length; i++) {
      const err = validateStep(i)
      if (err) {
        setStep(i)
        return
      }
    }
    onSubmit(buildPayload())
  }

  /* ---------- Summary panel ---------- */
  const summary = useMemo(() => {
    const typeMeta = TYPE_META[form.type]
    const clientLabel =
      form.client_mode === 'existing'
        ? selectedClient
          ? [selectedClient?.prenom, selectedClient?.nom].filter(Boolean).join(' ') || selectedClient?.nom || `Client #${selectedClient.id}`
          : '—'
        : [form.client?.prenom, form.client?.nom].filter(Boolean).join(' ') || form.client?.nom || 'Nouveau client'

    const details =
      form.type === 'billet_avion'
        ? `${form.flight_details?.ville_depart || '—'} → ${form.flight_details?.ville_arrivee || '—'}`
        : form.type === 'forfait'
        ? forfaits.find((f) => Number(f?.id) === Number(form.forfait_id))?.nom || '—'
        : produits.find((p) => Number(p?.id) === Number(form.produit_id))?.nom || '—'

    const pay = Number(form.acompte?.montant || 0)
    const total =
      form.type === 'billet_avion'
        ? Number(form.montant_sous_total || 0) + Number(form.montant_taxes || 0)
        : Number(form.montant_total || 0)
    const pct = total > 0 ? Math.min(100, Math.round((pay / total) * 100)) : 0

    return { typeMeta, clientLabel, details, total, pay, pct }
  }, [form, selectedClient, produits, forfaits])

  /* ---------- Render per step ---------- */
  const Step0 = (
    <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
      <Card title="Type de réservation" icon={<Ticket size={16} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => {
                const t = e.target.value as ReservationType
                set('type', t)
                set('produit_id', null)
                set('forfait_id', null)
              }}
            >
              {Object.entries(TYPE_META).map(([k, m]) => (
                <option key={k} value={k}>
                  {m.label}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">{TYPE_META[form.type].hint}</div>
          </div>

          <div>
            <label className="label">Nombre de personnes</label>
            <input
              type="number"
              min={1}
              className="input"
              value={form.nombre_personnes ?? 1}
              onChange={(e) => set('nombre_personnes', Number(e.target.value || 1))}
              disabled={form.type === 'voiture'}
            />
            {form.type === 'voiture' ? (
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Voiture: 1 réservation = 1 personne (fixé).</div>
            ) : null}
          </div>
        </div>
      </Card>

      <Card title="Client (payeur)" icon={<User size={16} />}>
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            className={cx('btn px-3', form.client_mode === 'existing' ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-gray-200 dark:bg-white/10')}
            onClick={() => set('client_mode', 'existing')}
          >
            Client existant
          </button>
          <button
            type="button"
            className={cx('btn px-3', form.client_mode === 'new' ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-gray-200 dark:bg-white/10')}
            onClick={() => set('client_mode', 'new')}
          >
            Nouveau client
          </button>
        </div>

        {form.client_mode === 'existing' ? (
          <div>
            <label className="label">Client *</label>
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              {qClients.isLoading
                ? 'Chargement des clients...'
                : qClients.isError
                ? 'Erreur de chargement des clients.'
                : `${filteredClients.length} / ${clients.length} client(s)`}
            </div>

            <div className="mt-2">
              <input
                className="input"
                placeholder="Rechercher un client (nom, téléphone, email)"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>

            <select
              className="input"
              value={form.client_id ?? ''}
              onChange={(e) => set('client_id', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Choisir —</option>
              {filteredClients.map((c) => {
                const name = [c?.prenom, c?.nom].filter(Boolean).join(' ') || c?.nom || `Client #${c?.id}`
                return (
                  <option key={c.id} value={c.id}>
                    {name}
                  </option>
                )
              })}
            </select>

            {selectedClient ? (
              <div className="mt-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3 text-xs text-gray-700 dark:text-gray-200">
                <div className="font-semibold">{[selectedClient?.prenom, selectedClient?.nom].filter(Boolean).join(' ')}</div>
                <div className="mt-1 text-gray-600 dark:text-gray-400">
                  {selectedClient?.email || '—'} • {selectedClient?.telephone || '—'}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={form.client?.nom ?? ''} onChange={(e) => set('client', { ...(form.client || {}), nom: e.target.value })} />
            </div>
            <div>
              <label className="label">Prénom</label>
              <input className="input" value={form.client?.prenom ?? ''} onChange={(e) => set('client', { ...(form.client || {}), prenom: e.target.value })} />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={form.client?.telephone ?? ''} onChange={(e) => set('client', { ...(form.client || {}), telephone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={form.client?.email ?? ''} onChange={(e) => set('client', { ...(form.client || {}), email: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Adresse</label>
              <input className="input" value={form.client?.adresse ?? ''} onChange={(e) => set('client', { ...(form.client || {}), adresse: e.target.value })} />
            </div>
          </div>
        )}
      </Card>
    </div>
  )

  const Step1 = (
    <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
      <Card title="Détails" icon={<FileText size={16} />}>
        {form.type === 'billet_avion' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label">Ville départ *</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input className="input pl-9" value={form.flight_details?.ville_depart ?? ''} onChange={(e) => setFlight({ ville_depart: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Ville arrivée *</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input className="input pl-9" value={form.flight_details?.ville_arrivee ?? ''} onChange={(e) => setFlight({ ville_arrivee: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label">Date départ *</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="date" className="input pl-9" value={form.flight_details?.date_depart ?? ''} onChange={(e) => setFlight({ date_depart: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">{isEdit ? 'Date arrivée *' : 'Date arrivée'}</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="date"
                    className="input pl-9"
                    value={String(form.flight_details?.date_arrivee ?? '')}
                    onChange={(e) => setFlight({ date_arrivee: e.target.value })}
                  />
                </div>
                {isEdit ? <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Requis en modification (backend).</div> : null}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="label">{isEdit ? 'Compagnie *' : 'Compagnie'}</label>
                <input className="input" value={String(form.flight_details?.compagnie ?? '')} onChange={(e) => setFlight({ compagnie: e.target.value })} />
                {isEdit ? <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Requis en modification (backend).</div> : null}
              </div>
              <div>
                <label className="label">Classe</label>
                <input className="input" value={String(form.flight_details?.classe ?? '')} onChange={(e) => setFlight({ classe: e.target.value })} />
              </div>
              <div>
                <label className="label">PNR</label>
                <input className="input" placeholder="Ex: CSSUNO" value={String(form.flight_details?.pnr ?? '')} onChange={(e) => setFlight({ pnr: e.target.value })} />
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Optionnel (nullable DB).</div>
              </div>
            </div>
          </div>
        ) : form.type === 'forfait' ? (
          <div>
            <label className="label">Forfait *</label>
            <select className="input" value={form.forfait_id ?? ''} onChange={(e) => set('forfait_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Choisir —</option>
              {forfaits.map((f) => (
                <option key={f.id} value={f.id}>
                  {f?.nom || `Forfait #${f?.id}`}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="label">Produit *</label>
            <select className="input" value={form.produit_id ?? ''} onChange={(e) => set('produit_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Choisir —</option>
              {produitsOfType.map((p) => (
                <option key={p.id} value={p.id}>
                  {p?.nom || `Produit #${p?.id}`}
                </option>
              ))}
            </select>

            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Produits filtrés automatiquement selon le type ({TYPE_META[form.type].label}).
            </div>
          </div>
        )}
      </Card>

      <Card title="Résumé" icon={TYPE_META[form.type].icon}>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-600 dark:text-gray-400">Type</span>
            <span className="font-medium">{TYPE_META[form.type].label}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-600 dark:text-gray-400">Client</span>
            <span className="font-medium truncate">{summary.clientLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-600 dark:text-gray-400">Détails</span>
            <span className="font-medium truncate">{summary.details}</span>
          </div>
        </div>
      </Card>
    </div>
  )

  const Step2 = (
    <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
      <Card title={form.type === 'billet_avion' ? 'Passager (bénéficiaire)' : 'Participants'} icon={<Users size={16} />}>
        {form.type === 'billet_avion' ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Qui bénéficie du billet ?</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cx('btn px-3', form.passenger_is_client ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-gray-200 dark:bg-white/10')}
                  onClick={() => set('passenger_is_client', true)}
                >
                  Le client
                </button>
                <button
                  type="button"
                  className={cx('btn px-3', !form.passenger_is_client ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-gray-200 dark:bg-white/10')}
                  onClick={() => set('passenger_is_client', false)}
                >
                  Une autre personne
                </button>
              </div>

              {isEdit ? (
                <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                  Note: ton backend ne gère pas (encore) la modification du passager côté update. On conserve l’UI, mais on n’envoie pas ces champs au PATCH/PUT.
                </div>
              ) : (
                <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                  Le passager sera géré côté backend (via <code>passenger_is_client</code> / <code>passenger</code>).
                </div>
              )}
            </div>

            {!form.passenger_is_client ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Nom passager *</label>
                  <input className="input" value={form.passenger?.nom ?? ''} onChange={(e) => setPassenger({ nom: e.target.value })} />
                </div>
                <div>
                  <label className="label">Prénom passager</label>
                  <input className="input" value={form.passenger?.prenom ?? ''} onChange={(e) => setPassenger({ prenom: e.target.value })} />
                </div>
              </div>
            ) : null}
          </div>
        ) : form.type === 'forfait' || form.type === 'evenement' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Ajoute des participants si nécessaire. (Nom requis)</div>
              <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={addParticipant}>
                + Ajouter
              </button>
            </div>

            {(form.participants || []).length === 0 ? (
              <div className="text-sm text-gray-500">Aucun participant.</div>
            ) : (
              <div className="space-y-2">
                {(form.participants || []).map((p, idx) => (
                  <div key={idx} className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="text-sm font-semibold">Participant {idx + 1}</div>
                      <button type="button" className="btn px-2 bg-gray-200 dark:bg-white/10" onClick={() => removeParticipant(idx)}>
                        Supprimer
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="label">Nom *</label>
                        <input className="input" value={p.nom ?? ''} onChange={(e) => updateParticipant(idx, { nom: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Prénom</label>
                        <input className="input" value={p.prenom ?? ''} onChange={(e) => updateParticipant(idx, { prenom: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Passeport</label>
                        <input className="input" value={p.passport ?? ''} onChange={(e) => updateParticipant(idx, { passport: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Âge</label>
                        <input
                          type="number"
                          className="input"
                          value={p.age ?? ''}
                          onChange={(e) => updateParticipant(idx, { age: e.target.value ? Number(e.target.value) : null })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="label">Remarques</label>
                        <input className="input" value={p.remarques ?? ''} onChange={(e) => updateParticipant(idx, { remarques: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Aucun participant requis pour ce type.</div>
        )}
      </Card>

      <Card title="Conseil" icon={<Receipt size={16} />}>
        <div className="text-sm text-gray-700 dark:text-gray-200 space-y-2">
          <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
            <div className="font-semibold">Bon workflow</div>
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Créer / modifier → facture → paiements → suivi.</div>
          </div>
        </div>
      </Card>
    </div>
  )

  const Step3 = (
    <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
      <Card title="Montants & Notes" icon={<Receipt size={16} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {form.type === 'billet_avion' ? (
            <>
              <div className="md:col-span-2 rounded-2xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Billet d&apos;avion — Tarification</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Saisis l&apos;achat (hors fees) et les fees (commission). Le total est calculé au backend.
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">Achat + Fees</span>
                </div>
              </div>

              <div>
                <label className="label">Achat (hors fees) *</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.montant_sous_total ?? ''}
                  onChange={(e) => set('montant_sous_total', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="Ex: 700000"
                />
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Prix d&apos;achat (hors commission).</div>
              </div>

              <div>
                <label className="label">Fees (commission)</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.montant_taxes ?? ''}
                  onChange={(e) => set('montant_taxes', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="Ex: 150000"
                />
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Marge/commission de l&apos;agence.</div>
              </div>

              <div className="md:col-span-2">
                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total estimé</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {money(Number(form.montant_sous_total || 0) + Number(form.montant_taxes || 0))}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Affichage uniquement (backend calcule le total réel).</div>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="label">Montant total *</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.montant_total ?? ''}
                onChange={(e) => set('montant_total', e.target.value === '' ? undefined : Number(e.target.value))}
              />
            </div>
          )}

          <div>
            <label className="label">Référence (optionnel)</label>
            <input
              className="input"
              placeholder="Laisse vide pour auto-génération"
              value={String(form.reference ?? '')}
              onChange={(e) => set('reference', e.target.value || null)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="label">Notes</label>
            <textarea className="input min-h-[110px]" value={String(form.notes ?? '')} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
      </Card>

      <Card title="Résumé paiement" icon={<FileText size={16} />}>
        <div className="space-y-3">
          <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-600 dark:text-gray-400">Total</span>
              <span className="font-semibold">{money(summary.total)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 mt-2">
              <span className="text-gray-600 dark:text-gray-400">Acompte (optionnel)</span>
              <span className="font-semibold">{money(summary.pay)}</span>
            </div>
            <div className="mt-3">
              <div className="text-xs text-gray-600 dark:text-gray-400">% couvert</div>
              <div className="mt-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${summary.pct}%` }} />
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            L’acompte est enregistré après {isEdit ? 'modification' : 'création'} (géré dans <code>ReservationsPage.tsx</code>).
          </div>
        </div>
      </Card>
    </div>
  )

  const Step4 = (
    <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
      <Card title="Acompte (optionnel)" icon={<Receipt size={16} />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Montant</label>
            <input
              type="number"
              min={0}
              className="input"
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
            />
          </div>
          <div>
            <label className="label">Mode</label>
            <select
              className="input"
              value={form.acompte?.mode_paiement ?? 'especes'}
              onChange={(e) => set('acompte', { ...(form.acompte || {}), mode_paiement: e.target.value })}
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
              value={form.acompte?.reference ?? ''}
              onChange={(e) => set('acompte', { ...(form.acompte || {}), reference: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-600 dark:text-gray-400">Total</span>
            <span className="font-semibold">{money(summary.total)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 mt-2">
            <span className="text-gray-600 dark:text-gray-400">Acompte</span>
            <span className="font-semibold">{money(form.acompte?.montant)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 mt-2">
            <span className="text-gray-600 dark:text-gray-400">Reste</span>
            <span className="font-semibold">{money(Math.max(0, Number(summary.total || 0) - Number(form.acompte?.montant || 0)))}</span>
          </div>
        </div>
      </Card>

      <Card title="Avant d’enregistrer" icon={<FileText size={16} />}>
        <div className="text-sm text-gray-700 dark:text-gray-200 space-y-2">
          <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-3">
            <div className="font-semibold">Vérification rapide</div>
            <ul className="mt-2 text-xs text-gray-600 dark:text-gray-400 list-disc pl-4 space-y-1">
              <li>Client sélectionné (ou nouveau client valide)</li>
              <li>Détails du type (vol / produit / forfait)</li>
              <li>Montant total</li>
              <li>Acompte optionnel</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )

  const currentStepUI = [Step0, Step1, Step2, Step3, Step4][step]
  const stepError = validateStep(step)

  return (
    <div className="space-y-4">
      <Stepper steps={steps} current={step} onGo={(i) => setStep(i)} title={isEdit ? 'Modifier réservation' : 'Nouvelle réservation'} />

      {stepError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {stepError}
        </div>
      ) : null}

      {currentStepUI}

      <div className="flex items-center justify-between gap-2 pt-2">
        <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={onCancel} disabled={!!submitting}>
          Annuler
        </button>

        <div className="flex items-center gap-2">
          <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={prev} disabled={step === 0 || !!submitting}>
            <ChevronLeft size={16} className="mr-1" />
            Précédent
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              className="btn bg-gray-900 text-white dark:bg-white dark:text-black"
              onClick={next}
              disabled={!canGoNext || !!submitting}
            >
              Suivant
              <ChevronRight size={16} className="ml-1" />
            </button>
          ) : (
            <button
              type="button"
              className="btn bg-gray-900 text-white dark:bg-white dark:text-black"
              onClick={onFinalSubmit}
              disabled={!!submitting}
            >
              Enregistrer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}