// src/features/reservations/ReservationsForm.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { ChevronDown, Wallet } from 'lucide-react'

export type ReservationType = 'billet_avion' | 'hotel' | 'voiture' | 'evenement' | 'forfait'

type ClientMini = {
  id: number
  nom: string
  prenom?: string | null
  email?: string | null
  telephone?: string | null
}

type ProduitMini = {
  id: number
  nom?: string
  type?: string
  prix_base?: number
}

type ForfaitMini = {
  id: number
  nom?: string
  type?: 'solo' | 'couple' | 'famille' | string
  prix?: number
  prix_adulte?: number
  prix_enfant?: number
}

type ParticipantInput = {
  nom: string
  prenom?: string
  age?: number
}

// 🔸 Acompte (front-only) : retiré du payload côté ReservationsPage
export type AcompteInput = {
  montant?: number | string | null
  mode_paiement?: string | null
  reference?: string | null
}

export type ReservationInput = {
  client_id?: number | null
  client?: {
    nom: string
    prenom?: string | null
    email?: string | null
    telephone?: string | null
    adresse?: string | null
    pays?: string | null
    notes?: string | null
  }

  type: ReservationType

  produit_id?: number | null
  forfait_id?: number | null

  ville_depart?: string | null
  ville_arrivee?: string | null
  date_depart?: string | null
  date_arrivee?: string | null
  compagnie?: string | null

  flight_details?: {
    ville_depart: string
    ville_arrivee: string
    date_depart: string
    date_arrivee: string
    compagnie: string
  } | null

  nombre_personnes?: number | null
  montant_sous_total?: number | string | null
  montant_total?: number | null

  participants?: ParticipantInput[]
  notes?: string | null

  // front-only
  acompte?: AcompteInput
}

type Props = {
  defaultValues?: Partial<any>
  onSubmit: (vals: ReservationInput) => void
  onCancel: () => void
  submitting?: boolean
}

const normalizeList = (input: any): any[] => {
  if (!input) return []
  if (Array.isArray(input)) return input
  if (Array.isArray(input.data)) return input.data
  if (Array.isArray(input.items)) return input.items
  if (Array.isArray(input?.data?.data)) return input.data.data
  return []
}

const toIntOrNull = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

const toNumberOrNull = (v: any) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const calcSousTotalFromProduit = (prixBase: any, nb: any) => {
  const p = Number(prixBase || 0)
  const n = Math.max(1, Number(nb || 1))
  return p * n
}

const calcSousTotalFromForfait = (forfait: any, participants: any[]) => {
  if (!forfait) return 0

  const type = forfait.type
  const count = Math.max(1, participants?.length || 1)

  if (forfait.prix != null) {
    if (type === 'solo') return Number(forfait.prix)
    if (type === 'couple') return Number(forfait.prix) * Math.max(2, count)
    return Number(forfait.prix) * count
  }

  if (type === 'famille') {
    const pa = Number(forfait.prix_adulte || 0)
    const pe = Number(forfait.prix_enfant || 0)

    let adultes = 0
    let enfants = 0
    for (const p of participants || []) {
      const age = Number(p?.age)
      if (!Number.isFinite(age)) continue
      if (age < 12) enfants++
      else adultes++
    }

    if (adultes + enfants === 0) return (pa || 0) * count
    return adultes * pa + enfants * pe
  }

  return 0
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft p-4 space-y-3">
      <div className="font-semibold">{title}</div>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
    </div>
  )
}

const money = (n: any, devise = 'XOF') => `${Number(n || 0).toLocaleString()} ${devise}`

type BeneficiaryMode = 'client' | 'autre'

export const ReservationsForm: React.FC<Props> = ({ defaultValues, onSubmit, onCancel, submitting }) => {
  const [useNewClient, setUseNewClient] = useState(false)

  // ✅ Billet d’avion : bénéficiaire clair
  const [beneficiaryMode, setBeneficiaryMode] = useState<BeneficiaryMode>('client')

  // participants (UI)
  const [participantFormOpen, setParticipantFormOpen] = useState(false)
  const [draftParticipant, setDraftParticipant] = useState<{ nom: string; prenom: string; age: string }>({
    nom: '',
    prenom: '',
    age: '',
  })
  const [participantErrors, setParticipantErrors] = useState<{ nom?: string; prenom?: string; age?: string }>({})
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const clearDraft = () => {
    setDraftParticipant({ nom: '', prenom: '', age: '' })
    setParticipantErrors({})
  }

  const form = useForm<ReservationInput>({
    defaultValues: {
      type: (defaultValues?.type as ReservationType) || 'billet_avion',

      client_id: defaultValues?.client_id ?? null,
      produit_id: defaultValues?.produit_id ?? null,
      forfait_id: defaultValues?.forfait_id ?? null,

      ville_depart: defaultValues?.ville_depart ?? '',
      ville_arrivee: defaultValues?.ville_arrivee ?? '',
      date_depart: defaultValues?.date_depart ?? '',
      date_arrivee: defaultValues?.date_arrivee ?? '',
      compagnie: defaultValues?.compagnie ?? '',

      nombre_personnes: defaultValues?.nombre_personnes ?? 1,

      // ✅ billet: on utilise ce champ comme "prix par personne" (et on calcule total)
      montant_sous_total: defaultValues?.montant_sous_total ?? '',

      notes: defaultValues?.notes ?? '',
      participants: defaultValues?.participants ?? [],

      client: defaultValues?.client ?? {
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        adresse: '',
        pays: 'Sénégal',
        notes: '',
      },

      acompte: defaultValues?.acompte ?? {
        montant: '',
        mode_paiement: 'especes',
        reference: '',
      },
    },
  })

  const {
    register,
    watch,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = form

  const type = watch('type')
  const produitId = watch('produit_id')
  const forfaitId = watch('forfait_id')
  const nbPersonnes = watch('nombre_personnes')
  const sousTotalInput = watch('montant_sous_total')
  const participantsWatch = watch('participants') ?? []

  const participantsFA = useFieldArray({ control: form.control, name: 'participants' })

  const qClients = useQuery({
    queryKey: ['clients-mini'],
    queryFn: async () => {
      const { data } = await api.get('/clients', { params: { page: 1, per_page: 200 } })
      return normalizeList(data)
    },
  })

  const qProduits = useQuery({
    queryKey: ['produits-mini', type],
    queryFn: async () => {
      const { data } = await api.get('/produits', {
        params: {
          page: 1,
          per_page: 300,
          type: type === 'billet_avion' || type === 'forfait' ? undefined : type,
        },
      })
      return normalizeList(data)
    },
    enabled: type !== 'billet_avion' && type !== 'forfait',
  })

  const qForfaits = useQuery({
    queryKey: ['forfaits-mini'],
    queryFn: async () => {
      const { data } = await api.get('/forfaits', { params: { page: 1, per_page: 300 } })
      return normalizeList(data)
    },
  })

  const clients: ClientMini[] = useMemo(() => qClients.data ?? [], [qClients.data])
  const produits: ProduitMini[] = useMemo(() => qProduits.data ?? [], [qProduits.data])
  const forfaits: ForfaitMini[] = useMemo(() => qForfaits.data ?? [], [qForfaits.data])

  const selectedProduit = useMemo(() => produits.find((p) => p.id === Number(produitId)), [produits, produitId])
  const selectedForfait = useMemo(() => forfaits.find((f) => f.id === Number(forfaitId)), [forfaits, forfaitId])

  const isSoloForfaitSelected = useMemo(() => {
    if (!selectedForfait) return false
    return String(selectedForfait.type) === 'solo'
  }, [selectedForfait])

  // ✅ Total estimé (avec billet avion: prix/personne × nb)
  const estimatedTotal = useMemo(() => {
    const nb = toIntOrNull(nbPersonnes) || 1

    if (type === 'billet_avion') {
      const unit = toNumberOrNull(sousTotalInput) ?? 0
      return unit * nb
    }

    if (type === 'voiture') return calcSousTotalFromProduit(selectedProduit?.prix_base, 1)

    if (type === 'hotel') return calcSousTotalFromProduit(selectedProduit?.prix_base, nb)

    if (type === 'evenement') {
      if (selectedForfait) return calcSousTotalFromForfait(selectedForfait, participantsWatch)
      return calcSousTotalFromProduit(selectedProduit?.prix_base, nb)
    }

    if (type === 'forfait') return calcSousTotalFromForfait(selectedForfait, participantsWatch)

    return 0
  }, [type, sousTotalInput, selectedProduit, nbPersonnes, selectedForfait, participantsWatch])

  const validateDraftParticipant = (opts: { requirePrenom: boolean; requireAge: boolean }) => {
    const errs: { nom?: string; prenom?: string; age?: string } = {}

    const nom = draftParticipant.nom.trim()
    const prenom = draftParticipant.prenom.trim()

    if (!nom) errs.nom = 'Nom obligatoire.'
    if (opts.requirePrenom && !prenom) errs.prenom = 'Prénom obligatoire.'

    if (opts.requireAge) {
      if (draftParticipant.age.trim() === '') {
        errs.age = 'Âge obligatoire.'
      } else {
        const age = Number(draftParticipant.age)
        if (!Number.isFinite(age)) errs.age = 'Âge invalide.'
        else if (age < 0) errs.age = 'Âge doit être >= 0.'
      }
    } else {
      if (draftParticipant.age.trim() !== '') {
        const age = Number(draftParticipant.age)
        if (!Number.isFinite(age)) errs.age = 'Âge invalide.'
        else if (age < 0) errs.age = 'Âge doit être >= 0.'
      }
    }

    setParticipantErrors(errs)
    return Object.keys(errs).length === 0
  }

  // reset en édition uniquement
  useEffect(() => {
    if (!defaultValues) return
    reset({
      type: (defaultValues?.type as ReservationType) || 'billet_avion',
      client_id: defaultValues?.client_id ?? null,
      produit_id: defaultValues?.produit_id ?? null,
      forfait_id: defaultValues?.forfait_id ?? null,

      ville_depart: defaultValues?.ville_depart ?? '',
      ville_arrivee: defaultValues?.ville_arrivee ?? '',
      date_depart: defaultValues?.date_depart ?? '',
      date_arrivee: defaultValues?.date_arrivee ?? '',
      compagnie: defaultValues?.compagnie ?? '',

      nombre_personnes: defaultValues?.nombre_personnes ?? 1,
      montant_sous_total: defaultValues?.montant_sous_total ?? '',

      notes: defaultValues?.notes ?? '',
      participants: defaultValues?.participants ?? [],

      client: defaultValues?.client ?? {
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        adresse: '',
        pays: 'Sénégal',
        notes: '',
      },

      acompte: defaultValues?.acompte ?? {
        montant: '',
        mode_paiement: 'especes',
        reference: '',
      },
    })

    // ✅ déduire mode bénéficiaire en édition (heuristique)
    const nb = Number(defaultValues?.nombre_personnes ?? 1)
    const parts = Array.isArray(defaultValues?.participants) ? defaultValues.participants : []
    if ((defaultValues?.type as any) === 'billet_avion') {
      // si on a autant de participants que nb -> probablement "autre" (tous passagers saisis)
      if (parts.length >= nb) setBeneficiaryMode('autre')
      else setBeneficiaryMode('client')
    }
  }, [defaultValues, reset])

  // règles UI
  useEffect(() => {
    if (type === 'voiture') {
      setValue('nombre_personnes', 1)
      setValue('participants', [])
    }
    if (type === 'billet_avion') {
      setValue('produit_id', null)
      setValue('forfait_id', null)
      // billets: participants gérés selon bénéficiaire/nb → on ne vide pas automatiquement
    }
    if (type === 'forfait') {
      setValue('produit_id', null)
    }
  }, [type, setValue])

  // ✅ Acompte toggle (UI)
  const [acompteOpen, setAcompteOpen] = useState(false)

  // ✅ validations “logiques” avant submit
  const ensureClient = (vals: ReservationInput) => {
    if (useNewClient) {
      if (!vals.client?.nom?.trim()) {
        setError('client.nom' as any, { type: 'manual', message: 'Nom du client requis.' })
        return false
      }
      clearErrors('client.nom' as any)
      return true
    }

    const cid = toIntOrNull(vals.client_id)
    if (!cid) {
      setError('client_id' as any, { type: 'manual', message: 'Client requis.' })
      return false
    }
    clearErrors('client_id' as any)
    return true
  }

  const submit = (vals: ReservationInput) => {
    // 1) client obligatoire
    if (!ensureClient(vals)) return

    const payload: ReservationInput = {
      type: vals.type,
      notes: vals.notes?.trim() ? vals.notes : null,
    }

    // client
    if (useNewClient) {
      payload.client = {
        nom: vals.client!.nom.trim(),
        prenom: vals.client?.prenom?.trim() || null,
        email: vals.client?.email?.trim() || null,
        telephone: vals.client?.telephone?.trim() || null,
        adresse: vals.client?.adresse?.trim() || null,
        pays: vals.client?.pays?.trim() || null,
        notes: vals.client?.notes?.trim() || null,
      }
    } else {
      payload.client_id = toIntOrNull(vals.client_id)
    }

    const normalizedParticipants: ParticipantInput[] = (vals.participants ?? [])
      .filter((p) => (p.nom || '').trim())
      .map((p) => ({
        nom: (p.nom || '').trim(),
        prenom: p.prenom?.trim() || undefined,
        age: p.age != null && p.age !== ('' as any) ? Number(p.age) : undefined,
      }))

    // ==========================
    // BILLET AVION
    // ==========================

    if (acompteOpen) {
      const m = toNumberOrNull(vals.acompte?.montant)
      if (m != null && m > 0) {
        payload.acompte = {
          montant: m,
          mode_paiement: (vals.acompte?.mode_paiement || 'especes') as any,
          reference: vals.acompte?.reference?.trim() || null,
        }
      } else {
        payload.acompte = undefined
      }
    } else {
      payload.acompte = undefined
    }
    if (vals.type === 'billet_avion') {
      const nb = toIntOrNull(vals.nombre_personnes) || 1

      const vd = (vals.ville_depart || '').trim()
      const va = (vals.ville_arrivee || '').trim()
      const dd = (vals.date_depart || '').trim()
      const da = (vals.date_arrivee || '').trim()
      const cp = (vals.compagnie || '').trim()

      if (!vd || !va || !dd || !da || !cp) {
        // messages déjà via RHF sur inputs, mais on sécurise
        alert('Veuillez remplir tous les détails du vol.')
        return
      }

      // ✅ billet: montant_sous_total = PRIX PAR PERSONNE
      const unit = toNumberOrNull(vals.montant_sous_total)
      if (unit == null) {
        setError('montant_sous_total' as any, { type: 'manual', message: 'Prix par personne obligatoire.' })
        return
      }
      clearErrors('montant_sous_total' as any)

      // ✅ passagers requis
      // - si nb == 1 :
      //    - mode client => aucun participant requis
      //    - mode autre  => 1 participant requis (le bénéficiaire)
      // - si nb > 1 :
      //    - mode client => participants requis = nb-1 (autres passagers)
      //    - mode autre  => participants requis = nb (tous passagers)
      const requiredCount =
        nb === 1
          ? beneficiaryMode === 'autre'
            ? 1
            : 0
          : beneficiaryMode === 'autre'
          ? nb
          : nb - 1

      if (normalizedParticipants.length < requiredCount) {
        alert(
          beneficiaryMode === 'autre'
            ? `Veuillez ajouter ${requiredCount} passager(s) (tous les bénéficiaires).`
            : `Veuillez ajouter ${requiredCount} passager(s) (hors client).`
        )
        return
      }

      payload.nombre_personnes = nb
      payload.montant_sous_total = unit * nb
      payload.montant_total = unit * nb

      payload.flight_details = {
        ville_depart: vd,
        ville_arrivee: va,
        date_depart: dd,
        date_arrivee: da,
        compagnie: cp,
      }

      payload.produit_id = null
      payload.forfait_id = null

      // ✅ on envoie participants seulement si nécessaire (mais si l’UI a collecté, on envoie)
      payload.participants = requiredCount > 0 ? normalizedParticipants.slice(0, requiredCount) : []

      // éviter ambiguïté champs plats
      payload.ville_depart = null
      payload.ville_arrivee = null
      payload.date_depart = null
      payload.date_arrivee = null
      payload.compagnie = null

      onSubmit(payload)
      return
    }

    // ==========================
    // HOTEL / VOITURE / EVENEMENT
    // ==========================
    if (vals.type === 'hotel' || vals.type === 'voiture' || vals.type === 'evenement') {
      payload.produit_id = toIntOrNull(vals.produit_id)
      if (!payload.produit_id) {
        alert('Produit requis.')
        return
      }

      const produit = produits.find((p) => p.id === payload.produit_id)
      const nb = vals.type === 'voiture' ? 1 : toIntOrNull(vals.nombre_personnes) || 1
      payload.nombre_personnes = nb

      let sousTotal = calcSousTotalFromProduit(produit?.prix_base, nb)

      if (vals.type === 'voiture' || vals.type === 'hotel') {
        payload.participants = undefined
        payload.forfait_id = null
      }

      if (vals.type === 'evenement') {
        payload.forfait_id = toIntOrNull(vals.forfait_id) // optionnel
        payload.participants = normalizedParticipants

        if (payload.forfait_id) {
          const f = forfaits.find((x) => x.id === payload.forfait_id)
          sousTotal = calcSousTotalFromForfait(f, normalizedParticipants)
        }
      }

      payload.montant_sous_total = sousTotal
      payload.montant_total = sousTotal

      onSubmit(payload)
      return
    }

    // ==========================
    // FORFAIT
    // ==========================
    if (vals.type === 'forfait') {
      payload.forfait_id = toIntOrNull(vals.forfait_id)
      if (!payload.forfait_id) {
        alert('Forfait requis.')
        return
      }

      payload.produit_id = null
      payload.participants = normalizedParticipants

      const f = forfaits.find((x) => x.id === payload.forfait_id)
      const sousTotal = calcSousTotalFromForfait(f, normalizedParticipants)

      payload.montant_sous_total = sousTotal
      payload.montant_total = sousTotal

      onSubmit(payload)
      return
    }

    onSubmit(payload)
  }

  const canHaveParticipants = type === 'evenement' || type === 'forfait' || type === 'billet_avion'

  // UI helpers
  const nb = toIntOrNull(nbPersonnes) || 1
  const billetRequiredCount =
    type === 'billet_avion'
      ? nb === 1
        ? beneficiaryMode === 'autre'
          ? 1
          : 0
        : beneficiaryMode === 'autre'
        ? nb
        : nb - 1
      : 0

  const participantLabel =
    type === 'billet_avion'
      ? beneficiaryMode === 'autre'
        ? 'Passagers (bénéficiaires)'
        : 'Autres passagers (hors client)'
      : 'Participants (Nom, Prénom, Âge)'

  const participantHint =
    type === 'billet_avion'
      ? beneficiaryMode === 'autre'
        ? `Ajoutez tous les bénéficiaires du billet (${billetRequiredCount} requis).`
        : `Le client est bénéficiaire. Ajoutez les autres passagers (${billetRequiredCount} requis).`
      : 'Ajoute les bénéficiaires (événements & forfaits).'

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col max-h-[80vh]">
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        <Section title="Type & Client">
          <Row>
            <Field label="Type de réservation">
              <select className="input" {...register('type')}>
                <option value="billet_avion">Billet d’avion</option>
                <option value="hotel">Hôtel</option>
                <option value="voiture">Voiture</option>
                <option value="evenement">Événement</option>
                <option value="forfait">Forfait</option>
              </select>
            </Field>

            <Field label="Mode client">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`btn ${!useNewClient ? 'bg-gray-200 dark:bg-white/10' : 'bg-transparent'}`}
                  onClick={() => setUseNewClient(false)}
                >
                  Client existant
                </button>
                <button
                  type="button"
                  className={`btn ${useNewClient ? 'bg-gray-200 dark:bg-white/10' : 'bg-transparent'}`}
                  onClick={() => setUseNewClient(true)}
                >
                  Nouveau client
                </button>
              </div>
            </Field>
          </Row>

          {!useNewClient ? (
            <Row>
              <Field label="Client *">
                <select className="input" {...register('client_id')}>
                  <option value="">— Choisir —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {[(c.prenom || '').trim(), (c.nom || '').trim()].filter(Boolean).join(' ') || `Client #${c.id}`}
                    </option>
                  ))}
                </select>
                {errors.client_id ? (
                  <div className="text-xs text-red-600 mt-1">{String((errors as any).client_id?.message)}</div>
                ) : null}
              </Field>
              <div />
            </Row>
          ) : (
            <div className="space-y-3">
              <Row>
                <Field label="Nom *">
                  <input className="input" {...register('client.nom')} placeholder="Nom" />
                  {(errors as any).client?.nom ? (
                    <div className="text-xs text-red-600 mt-1">{String((errors as any).client?.nom?.message)}</div>
                  ) : null}
                </Field>
                <Field label="Prénom">
                  <input className="input" {...register('client.prenom')} placeholder="Prénom" />
                </Field>
              </Row>

              <Row>
                <Field label="Email">
                  <input className="input" {...register('client.email')} placeholder="email@exemple.com" />
                </Field>
                <Field label="Téléphone">
                  <input className="input" {...register('client.telephone')} placeholder="+221 ..." />
                </Field>
              </Row>

              <Row>
                <Field label="Adresse">
                  <input className="input" {...register('client.adresse')} placeholder="Adresse" />
                </Field>
                <Field label="Pays">
                  <input className="input" {...register('client.pays')} placeholder="Sénégal" />
                </Field>
              </Row>
            </div>
          )}
        </Section>

        {type === 'billet_avion' && (
          <>
            <Section title="Billet d’avion — Détails du vol">
              <Row>
                <Field label="Ville départ *">
                  <input className="input" {...register('ville_depart', { required: 'Ville départ obligatoire' })} placeholder="Dakar" />
                  {errors.ville_depart ? <div className="text-xs text-red-600 mt-1">{String(errors.ville_depart.message)}</div> : null}
                </Field>

                <Field label="Ville arrivée *">
                  <input className="input" {...register('ville_arrivee', { required: 'Ville arrivée obligatoire' })} placeholder="Paris" />
                  {errors.ville_arrivee ? <div className="text-xs text-red-600 mt-1">{String(errors.ville_arrivee.message)}</div> : null}
                </Field>
              </Row>

              <Row>
                <Field label="Date départ *">
                  <input className="input" type="date" {...register('date_depart', { required: 'Date départ obligatoire' })} />
                  {errors.date_depart ? <div className="text-xs text-red-600 mt-1">{String(errors.date_depart.message)}</div> : null}
                </Field>

                <Field label="Date arrivée *">
                  <input className="input" type="date" {...register('date_arrivee', { required: 'Date arrivée obligatoire' })} />
                  {errors.date_arrivee ? <div className="text-xs text-red-600 mt-1">{String(errors.date_arrivee.message)}</div> : null}
                </Field>
              </Row>

              <Row>
                <Field label="Compagnie *">
                  <input className="input" {...register('compagnie', { required: 'Compagnie obligatoire' })} placeholder="Air France" />
                  {errors.compagnie ? <div className="text-xs text-red-600 mt-1">{String(errors.compagnie.message)}</div> : null}
                </Field>

                <Field label="Nombre de personnes">
                  <input className="input" type="number" min={1} {...register('nombre_personnes')} />
                </Field>
              </Row>

              <Row>
                <Field
                  label="Prix par personne *"
                  hint="Taxes = 0%. Le total est calculé automatiquement (prix × nombre de personnes)."
                >
                  <input className="input" type="number" min={0} step="1" {...register('montant_sous_total', { required: 'Prix par personne obligatoire' })} />
                  {errors.montant_sous_total ? <div className="text-xs text-red-600 mt-1">{String(errors.montant_sous_total.message)}</div> : null}
                </Field>
                <div />
              </Row>

              <div className="mt-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Total estimé</span>
                <span className="font-semibold">{money(estimatedTotal, 'XOF')}</span>
              </div>
            </Section>

            <Section title="Billet d’avion — Bénéficiaire(s)">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Indique clairement <b>qui va utiliser le billet</b>. Si c’est pour une autre personne, ajoutez le/les passager(s).
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`btn ${beneficiaryMode === 'client' ? 'bg-gray-200 dark:bg-white/10' : 'bg-transparent'}`}
                  onClick={() => {
                    setBeneficiaryMode('client')
                    // si nb==1, on peut vider les passagers (optionnel)
                    // (on ne force pas un reset agressif)
                  }}
                >
                  Le client est le bénéficiaire
                </button>
                <button
                  type="button"
                  className={`btn ${beneficiaryMode === 'autre' ? 'bg-gray-200 dark:bg-white/10' : 'bg-transparent'}`}
                  onClick={() => setBeneficiaryMode('autre')}
                >
                  Le client achète pour quelqu’un d’autre
                </button>
              </div>

              <div className="mt-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Passagers requis</span>
                <span className="font-semibold">{billetRequiredCount}</span>
              </div>

              {billetRequiredCount === 0 ? (
                <div className="text-sm text-gray-500 mt-2">
                  Aucun passager à ajouter. Le billet est pour le client.
                </div>
              ) : (
                <div className="text-sm text-gray-500 mt-2">
                  {beneficiaryMode === 'autre'
                    ? 'Ajoutez tous les passagers (bénéficiaires).'
                    : 'Ajoutez uniquement les autres passagers (hors client).'}
                </div>
              )}
            </Section>
          </>
        )}

        {(type === 'hotel' || type === 'voiture' || type === 'evenement') && (
          <Section title="Produit">
            <Row>
              <Field label="Produit *">
                <select className="input" {...register('produit_id')}>
                  <option value="">— Choisir —</option>
                  {produits.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.nom || `Produit #${p.id}`} {p.prix_base != null ? `— ${Number(p.prix_base).toLocaleString()} XOF` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              {type !== 'voiture' ? (
                <Field label="Nombre de personnes">
                  <input className="input" type="number" min={1} {...register('nombre_personnes')} />
                </Field>
              ) : (
                <Field label="Nombre de personnes" hint="Voiture = 1 personne (fixé).">
                  <input className="input" type="number" value={1} disabled />
                </Field>
              )}
            </Row>

            {type === 'evenement' ? (
              <Row>
                <Field label="Forfait (optionnel)">
                  <select className="input" {...register('forfait_id')}>
                    <option value="">— Aucun —</option>
                    {forfaits.map((f) => (
                      <option key={f.id} value={String(f.id)}>
                        {f.nom || `Forfait #${f.id}`} {f.type ? `— ${f.type}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <div />
              </Row>
            ) : null}

            <div className="mt-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Total estimé</span>
              <span className="font-semibold">{money(estimatedTotal, 'XOF')}</span>
            </div>

            <div className="text-xs text-gray-500">Le montant est calculé automatiquement. Taxes = 0.</div>
          </Section>
        )}

        {type === 'forfait' && (
          <Section title="Forfait">
            <Row>
              <Field label="Forfait *">
                <select className="input" {...register('forfait_id')}>
                  <option value="">— Choisir —</option>
                  {forfaits.map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.nom || `Forfait #${f.id}`} {f.type ? `— ${f.type}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <div />
            </Row>

            <div className="mt-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Total estimé</span>
              <span className="font-semibold">{money(estimatedTotal, 'XOF')}</span>
            </div>

            <div className="text-xs text-gray-500">Le montant est calculé automatiquement selon le forfait. Taxes = 0.</div>
          </Section>
        )}

        {/* Participants / passagers */}
        {canHaveParticipants && (
          <Section title={participantLabel}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">{participantHint}</div>

              <button
                type="button"
                className="btn-primary"
                disabled={((type === 'forfait' || type === 'evenement') && isSoloForfaitSelected) || submitting}
                onClick={() => {
                  setEditingIndex(null)
                  clearDraft()
                  setParticipantFormOpen(true)
                }}
              >
                Ajouter
              </button>
            </div>

            {((type === 'forfait' || type === 'evenement') && isSoloForfaitSelected) ? (
              <div className="text-xs text-gray-500">
                Forfait <b>solo</b> sélectionné : aucun participant n’est requis.
              </div>
            ) : null}

            {type !== 'billet_avion' ? (
              <div className="mt-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Total estimé</span>
                <span className="font-semibold">{money(estimatedTotal, 'XOF')}</span>
              </div>
            ) : null}

            {participantFormOpen ? (
              <div className="rounded-2xl border border-black/5 dark:border-white/10 p-3 bg-black/[0.02] dark:bg-white/[0.03]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Nom *">
                    <input
                      className="input"
                      value={draftParticipant.nom}
                      onChange={(e) => setDraftParticipant((s) => ({ ...s, nom: e.target.value }))}
                      placeholder="Nom"
                    />
                    {participantErrors.nom ? <div className="text-xs text-red-600 mt-1">{participantErrors.nom}</div> : null}
                  </Field>

                  <Field label={type === 'billet_avion' ? 'Prénom *' : 'Prénom'}>
                    <input
                      className="input"
                      value={draftParticipant.prenom}
                      onChange={(e) => setDraftParticipant((s) => ({ ...s, prenom: e.target.value }))}
                      placeholder="Prénom"
                    />
                    {participantErrors.prenom ? <div className="text-xs text-red-600 mt-1">{participantErrors.prenom}</div> : null}
                  </Field>

                  <Field label={type === 'billet_avion' ? 'Âge (optionnel)' : 'Âge *'}>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={draftParticipant.age}
                      onChange={(e) => setDraftParticipant((s) => ({ ...s, age: e.target.value }))}
                      placeholder={type === 'billet_avion' ? 'Ex: 25' : 'Obligatoire'}
                    />
                    {participantErrors.age ? <div className="text-xs text-red-600 mt-1">{participantErrors.age}</div> : null}
                  </Field>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="btn bg-gray-200 dark:bg-white/10"
                    onClick={() => {
                      setParticipantFormOpen(false)
                      setEditingIndex(null)
                      clearDraft()
                    }}
                  >
                    Annuler
                  </button>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      const ok = validateDraftParticipant({
                        requirePrenom: type === 'billet_avion',
                        requireAge: type !== 'billet_avion',
                      })
                      if (!ok) return

                      const nom = draftParticipant.nom.trim()
                      const prenom = draftParticipant.prenom.trim()
                      const age = draftParticipant.age.trim() === '' ? undefined : Number(draftParticipant.age)

                      const payload: ParticipantInput = {
                        nom,
                        prenom: prenom || undefined,
                        age: Number.isFinite(Number(age)) ? (age as any) : undefined,
                      }

                      if (editingIndex !== null) participantsFA.update(editingIndex, payload)
                      else participantsFA.append(payload)

                      setParticipantFormOpen(false)
                      setEditingIndex(null)
                      clearDraft()
                    }}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : null}

            {participantsFA.fields.length === 0 ? (
              <div className="text-sm text-gray-500">Aucun élément ajouté.</div>
            ) : (
              <div className="rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                <div className="max-h-[35vh] overflow-y-auto">
                  {participantsFA.fields.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 border-t border-black/5 dark:border-white/10 first:border-t-0"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {(p as any).nom} {(p as any).prenom ? ` ${(p as any).prenom}` : ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(p as any).age != null ? `Âge: ${(p as any).age}` : type === 'billet_avion' ? 'Âge: —' : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          className="btn px-2 bg-gray-200 dark:bg-white/10"
                          title="Modifier"
                          onClick={() => {
                            setEditingIndex(idx)
                            setDraftParticipant({
                              nom: String((p as any).nom ?? ''),
                              prenom: String((p as any).prenom ?? ''),
                              age: String((p as any).age ?? ''),
                            })
                            setParticipantErrors({})
                            setParticipantFormOpen(true)
                          }}
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          className="btn px-2 bg-red-600 text-white"
                          title="Supprimer"
                          onClick={() => participantsFA.remove(idx)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {type === 'billet_avion' && billetRequiredCount > 0 ? (
              <div className="text-xs text-gray-500">
                Astuce : vous pouvez ajouter uniquement {beneficiaryMode === 'autre' ? 'tous les passagers' : 'les autres passagers'}.
              </div>
            ) : null}
          </Section>
        )}

        {/* Acompte (optionnel, déclencheur) */}
        <Section title="Acompte (optionnel)">
          <button
            type="button"
            className="btn bg-gray-200 dark:bg-white/10 inline-flex items-center gap-2"
            onClick={() => setAcompteOpen((v) => !v)}
          >
            <Wallet size={16} />
            {acompteOpen ? 'Masquer l’acompte' : 'Ajouter un acompte'}
            <ChevronDown size={16} className={`transition-transform ${acompteOpen ? 'rotate-180' : ''}`} />
          </button>

          {acompteOpen ? (
            <div className="mt-3 space-y-3">
              <Row>
                <Field label="Montant">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="1"
                    {...register('acompte.montant')}
                    placeholder="Ex: 10000"
                    onChange={(e) => {
                      const v = e.target.value
                      // ✅ éviter l’erreur TS: on normalise en string puis Number au submit côté page
                      if (v === '') {
                        clearErrors('acompte.montant' as any)
                        return
                      }
                      const n = Number(v)
                      if (!Number.isFinite(n) || n < 0) {
                        setError('acompte.montant' as any, { type: 'manual', message: 'Montant invalide.' })
                      } else {
                        clearErrors('acompte.montant' as any)
                      }
                    }}
                  />
                  {(errors as any).acompte?.montant ? (
                    <div className="text-xs text-red-600 mt-1">{String((errors as any).acompte?.montant?.message)}</div>
                  ) : null}
                </Field>

                <Field label="Mode de paiement">
                  <select className="input" {...register('acompte.mode_paiement')}>
                    <option value="especes">Espèces</option>
                    <option value="wave">Wave</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="cheque">Chèque</option>
                    <option value="virement">Virement</option>
                    <option value="carte">Carte</option>
                  </select>
                </Field>
              </Row>

              <Row>
                <Field label="Référence (optionnel)">
                  <input className="input" {...register('acompte.reference')} placeholder="Ex: TXN-123 / Wave ref..." />
                </Field>
                <div />
              </Row>
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              Ajoutez un acompte si le client paye partiellement à la création (facultatif).
            </div>
          )}
        </Section>

        <Section title="Notes">
          <Field label="Notes">
            <textarea className="input min-h-[90px]" {...register('notes')} placeholder="Notes internes…" />
          </Field>
        </Section>
      </div>

      <div className="pt-3 mt-3 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-panel/80 backdrop-blur">
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={onCancel} disabled={submitting}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </form>
  )
}
