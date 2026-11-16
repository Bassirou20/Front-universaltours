// src/features/evisa/EvisaDossiersPage.tsx
import { LoadError } from '../../ui/LoadError'
import React, { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/axios'
import { useDebouncedValue, normalizePaged, money } from '../../lib/helpers'
import { Pagination } from '../../ui/Pagination'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/Toasts'
import { ReservationsForm, type ReservationInput } from '../reservations/ReservationsForm'
import {
  Search, Stamp, Globe, Calendar, Eye, Loader2, FolderArchive,
  CheckCircle2, AlertTriangle, Clock, Plus, Wallet,
} from 'lucide-react'

type EvisaStatut = 'constitution' | 'depose' | 'en_traitement' | 'accorde' | 'refuse' | 'restitue'

type EvisaDossier = {
  id: number
  reference: string | null
  statut: string | null
  evisa_statut: EvisaStatut
  client: { id: number; nom: string | null; prenom: string | null } | null
  pays_destination: string | null
  type_visa: string | null
  date_voyage: string | null
  docs_total: number
  docs_valides: number
  checklist_total: number
  montant_total: number
  montant_paye: number
  reste_a_payer: number
  created_at: string | null
}

const PER_PAGE = 15

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ')
}

function safeDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function clientName(c: EvisaDossier['client']) {
  if (!c) return '—'
  const n = [c.prenom, c.nom].filter(Boolean).join(' ').trim()
  return n || c.nom || '—'
}

/** Statut global du dossier déduit de l'avancement de la checklist. */
function dossierState(d: EvisaDossier): { label: string; tone: string; icon: React.ReactNode } {
  if (d.checklist_total > 0 && d.docs_valides >= d.checklist_total) {
    return { label: 'Complet', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', icon: <CheckCircle2 size={13} /> }
  }
  if (d.docs_total > 0) {
    return { label: 'En cours', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', icon: <Clock size={13} /> }
  }
  return { label: 'À compléter', tone: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300', icon: <AlertTriangle size={13} /> }
}

/* ── Cycle de vie consulaire (aligné avec ReservationEvisaDetail::STATUTS) ──── */
const EVISA_STATUT_OPTIONS: { value: EvisaStatut; label: string }[] = [
  { value: 'constitution',  label: 'En constitution' },
  { value: 'depose',        label: 'Déposé' },
  { value: 'en_traitement', label: 'En traitement' },
  { value: 'accorde',       label: 'Accordé' },
  { value: 'refuse',        label: 'Refusé' },
  { value: 'restitue',      label: 'Restitué' },
]

const EVISA_STATUT_TONE: Record<EvisaStatut, string> = {
  constitution:  'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/15',
  depose:        'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/25',
  en_traitement: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25',
  accorde:       'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25',
  refuse:        'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25',
  restitue:      'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25',
}

/** État de paiement déduit du montant facturé / encaissé. */
function paymentState(d: EvisaDossier): { label: string; tone: string } | null {
  const total = Number(d.montant_total || 0)
  if (total <= 0) return null
  const paid = Number(d.montant_paye || 0)
  if (paid <= 0) return { label: 'Impayé', tone: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' }
  if (Number(d.reste_a_payer || 0) > 0) return { label: 'Partiel', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' }
  return { label: 'Payé', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' }
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const tone = pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-gray-300 dark:bg-white/15'
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
        <div className={cx('h-full rounded-full transition-all', tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-semibold tabular-nums text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {value}/{total}
      </span>
    </div>
  )
}

type EtatFilter = '' | 'incomplet' | 'complet'

const ETAT_OPTIONS: { value: EtatFilter; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'incomplet', label: 'À compléter' },
  { value: 'complet', label: 'Complets' },
]

export default function EvisaDossiersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [etat, setEtat] = useState<EtatFilter>('')
  const [consular, setConsular] = useState<EvisaStatut | ''>('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const debouncedSearch = useDebouncedValue(search, 350)

  const q = useQuery({
    queryKey: ['evisa-dossiers', debouncedSearch, etat, consular, page],
    queryFn: async () => {
      const { data } = await api.get('/evisa-dossiers', {
        params: {
          search: debouncedSearch || undefined,
          etat: etat || undefined,
          evisa_statut: consular || undefined,
          page,
          per_page: PER_PAGE,
        },
      })
      return data
    },
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })

  // Création d'un nouveau dossier e-visa : on réutilise le formulaire de
  // réservation pré-réglé sur le type « evisa », puis on bascule vers la fiche
  // détaillée du dossier pour y déposer les pièces.
  const mCreate = useMutation({
    mutationFn: async (vals: ReservationInput) => {
      const { acompte, ...raw } = vals as any
      const body = { ...raw, statut: 'confirmee' }
      const res = await api.post('/reservations', body)
      return res.data?.data ?? res.data
    },
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ['evisa-dossiers'] })
      setFormOpen(false)
      toast.push({ title: 'Dossier e-visa créé ✓ — déposez les pièces justificatives', tone: 'success' })
      if (created?.id) navigate(`/reservations/${created.id}`)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la création du dossier.'
      toast.push({ title: msg, tone: 'error' })
    },
  })

  // Avancement du cycle consulaire (déposé, accordé, …) — distinct de la
  // facturation. La caisse reste pilotée depuis la fiche du dossier.
  const mStatut = useMutation({
    mutationFn: async ({ id, evisa_statut }: { id: number; evisa_statut: EvisaStatut }) => {
      const { data } = await api.patch(`/reservations/${id}/evisa-statut`, { evisa_statut })
      return data
    },
    onMutate: ({ id }) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evisa-dossiers'] })
      toast.push({ title: 'Étape du dossier mise à jour ✓', tone: 'success' })
    },
    onError: () => toast.push({ title: "Impossible de mettre à jour l'étape.", tone: 'error' }),
  })

  const paged = useMemo(() => normalizePaged(q.data), [q.data])
  const rows = paged.items as EvisaDossier[]

  // Compteur de dossiers incomplets sur la page courante (indicateur rapide).
  const incompletsCount = rows.filter((d) => !(d.checklist_total > 0 && d.docs_valides >= d.checklist_total)).length

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center">
            <FolderArchive size={18} />
          </span>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Dossiers e-visa</h1>
            <p className="text-xs text-gray-400">Pièces, étape consulaire et paiement — pilotés au même endroit</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {paged.total > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <AlertTriangle size={13} /> {incompletsCount} incomplet{incompletsCount > 1 ? 's' : ''} sur cette page
            </span>
          )}
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors whitespace-nowrap"
          >
            <Plus size={16} /> Nouveau dossier
          </button>
        </div>
      </div>

      {/* Recherche + filtres */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher un client…"
            className="w-full rounded-lg border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-white/[0.05] pl-9 pr-3 py-2 text-sm text-gray-800 dark:text-gray-100"
          />
        </div>

        {/* Segmented control : état du dossier (pleine largeur sur mobile) */}
        <div className="flex w-full sm:w-auto rounded-lg border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-white/[0.04] p-0.5">
          {ETAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setEtat(opt.value); setPage(1) }}
              className={cx(
                'flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap',
                etat === opt.value
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filtre par étape consulaire (pleine largeur sur mobile) */}
        <div className="relative w-full sm:w-auto">
          <Stamp size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={consular}
            onChange={(e) => { setConsular(e.target.value as EvisaStatut | ''); setPage(1) }}
            className="w-full sm:w-auto rounded-lg border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-white/[0.05] pl-8 pr-7 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 cursor-pointer"
          >
            <option value="">Toutes les étapes</option>
            {EVISA_STATUT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft overflow-hidden">
        {q.isError ? (
          <LoadError what="les dossiers e-visa" onRetry={() => q.refetch()} />
        ) : q.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 p-6"><Loader2 size={16} className="animate-spin" /> Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            <Stamp size={28} className="mx-auto mb-2 text-gray-300" />
            {search || etat || consular
              ? 'Aucun dossier ne correspond à ces critères.'
              : 'Aucune demande e-visa pour le moment.'}
          </div>
        ) : (
          <>
          {/* Desktop : tableau */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] uppercase tracking-wider text-gray-400 border-b border-black/[0.05] dark:border-white/[0.07]">
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Destination</th>
                  <th className="px-4 py-3 font-semibold">Voyage</th>
                  <th className="px-4 py-3 font-semibold">Avancement</th>
                  <th className="px-4 py-3 font-semibold">Étape consulaire</th>
                  <th className="px-4 py-3 font-semibold">Paiement</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const st = dossierState(d)
                  return (
                    <tr
                      key={d.id}
                      onClick={() => navigate(`/reservations/${d.id}`)}
                      className="border-b border-black/[0.04] dark:border-white/[0.05] last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.03] cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800 dark:text-gray-100">{clientName(d.client)}</div>
                        <div className="text-[12px] text-gray-400">{d.reference || `#${d.id}`}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                          <Globe size={13} className="text-gray-400" />
                          {d.pays_destination || '—'}
                        </div>
                        {d.type_visa && <div className="text-[12px] text-gray-400 mt-0.5">{d.type_visa}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                          <Calendar size={13} className="text-gray-400" />
                          {safeDate(d.date_voyage)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBar value={d.docs_valides} total={d.checklist_total} />
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold', st.tone)}>
                            {st.icon} {st.label}
                          </span>
                          <span className="text-[12px] text-gray-400">{d.docs_total} pièce{d.docs_total > 1 ? 's' : ''}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={d.evisa_statut}
                          disabled={busyId === d.id}
                          onChange={(e) => mStatut.mutate({ id: d.id, evisa_statut: e.target.value as EvisaStatut })}
                          className={cx(
                            'rounded-full border text-xs font-semibold px-2.5 py-1 cursor-pointer disabled:opacity-50',
                            EVISA_STATUT_TONE[d.evisa_statut]
                          )}
                        >
                          {EVISA_STATUT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const ps = paymentState(d)
                          if (!ps) return <span className="text-[12px] text-gray-400">—</span>
                          return (
                            <div className="space-y-1">
                              <span className={cx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold', ps.tone)}>
                                <Wallet size={11} /> {ps.label}
                              </span>
                              {Number(d.reste_a_payer || 0) > 0 && (
                                <div className="text-[12px] text-gray-400 whitespace-nowrap">Reste {money(d.reste_a_payer)}</div>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/reservations/${d.id}`) }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.12] px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                        >
                          <Eye size={13} /> Ouvrir
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile : cartes */}
          <div className="md:hidden divide-y divide-black/[0.05] dark:divide-white/[0.06]">
            {rows.map((d) => {
              const st = dossierState(d)
              const ps = paymentState(d)
              return (
                <div
                  key={d.id}
                  onClick={() => navigate(`/reservations/${d.id}`)}
                  className="p-4 space-y-3 active:bg-gray-50 dark:active:bg-white/[0.03] cursor-pointer"
                >
                  {/* Client + état du dossier */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 dark:text-gray-100 truncate">{clientName(d.client)}</div>
                      <div className="text-[12px] text-gray-400">{d.reference || `#${d.id}`}</div>
                    </div>
                    <span className={cx('shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold', st.tone)}>
                      {st.icon} {st.label}
                    </span>
                  </div>

                  {/* Destination + voyage */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <Globe size={12} className="text-gray-400 shrink-0" />
                      <span className="truncate">{d.pays_destination || '—'}{d.type_visa ? ` · ${d.type_visa}` : ''}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} className="text-gray-400 shrink-0" />
                      {safeDate(d.date_voyage)}
                    </span>
                  </div>

                  {/* Avancement de la checklist */}
                  <div className="flex items-center justify-between gap-3">
                    <ProgressBar value={d.docs_valides} total={d.checklist_total} />
                    <span className="text-[12px] text-gray-400 whitespace-nowrap">{d.docs_total} pièce{d.docs_total > 1 ? 's' : ''}</span>
                  </div>

                  {/* Étape consulaire + paiement */}
                  <div className="flex flex-wrap items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={d.evisa_statut}
                      disabled={busyId === d.id}
                      onChange={(e) => mStatut.mutate({ id: d.id, evisa_statut: e.target.value as EvisaStatut })}
                      className={cx(
                        'rounded-full border text-xs font-semibold px-2.5 py-1 cursor-pointer disabled:opacity-50',
                        EVISA_STATUT_TONE[d.evisa_statut]
                      )}
                    >
                      {EVISA_STATUT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {ps && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold', ps.tone)}>
                          <Wallet size={11} /> {ps.label}
                        </span>
                        {Number(d.reste_a_payer || 0) > 0 && (
                          <span className="text-[12px] text-gray-400 whitespace-nowrap">Reste {money(d.reste_a_payer)}</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          </>
        )}
      </div>

      {paged.lastPage > 1 && (
        <Pagination
          page={paged.page}
          lastPage={paged.lastPage}
          total={paged.total}
          perPage={PER_PAGE}
          onPage={setPage}
        />
      )}

      {/* ── Modal : nouveau dossier e-visa ── */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Nouveau dossier e-visa"
        widthClass="max-w-4xl"
      >
        <ReservationsForm
          defaultValues={{ type: 'evisa' }}
          submitting={mCreate.isPending}
          onCancel={() => setFormOpen(false)}
          onSubmit={(vals) => mCreate.mutate(vals)}
        />
      </Modal>
    </div>
  )
}
