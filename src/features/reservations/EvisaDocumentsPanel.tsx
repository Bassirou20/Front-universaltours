// src/features/reservations/EvisaDocumentsPanel.tsx
import React, { useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useToast } from '../../ui/Toasts'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import {
  FolderArchive, Upload, Download, Trash2, Loader2,
  CheckCircle2, FileText, AlertCircle, Eye, ChevronLeft, ChevronRight,
  MessageSquare, Check, X,
} from 'lucide-react'

/* ─── Référentiel métier (doit rester aligné avec EvisaDocument côté API) ──── */
type DocType = 'passeport' | 'photo_identite' | 'justificatif_voyage' | 'formulaire' | 'autre'
type DocStatut = 'en_attente' | 'recu' | 'valide' | 'rejete'

const TYPE_LABELS: Record<DocType, string> = {
  passeport: 'Passeport',
  photo_identite: "Photo d'identité",
  justificatif_voyage: 'Justificatif de voyage',
  formulaire: 'Formulaire',
  autre: 'Autre',
}

/** Pièces attendues d'un dossier (la « checklist » imposée — hors « autre »). */
const CHECKLIST: DocType[] = ['passeport', 'photo_identite', 'justificatif_voyage', 'formulaire']

const STATUT_LABELS: Record<DocStatut, string> = {
  en_attente: 'En attente',
  recu: 'Reçu',
  valide: 'Validé',
  rejete: 'Rejeté',
}

const STATUT_TONE: Record<DocStatut, string> = {
  en_attente: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25',
  recu: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/25',
  valide: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25',
  rejete: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25',
}

/* ── Cycle de vie consulaire (aligné avec ReservationEvisaDetail::STATUTS) ──── */
type EvisaStatut = 'constitution' | 'depose' | 'en_traitement' | 'accorde' | 'refuse' | 'restitue'

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

type EvisaDoc = {
  id: number
  reservation_id: number
  client_id: number | null
  type: DocType
  label: string | null
  statut: DocStatut
  original_name: string | null
  mime_type: string | null
  size: number | null
  notes: string | null
  uploaded_by: number | null
  download_url: string
  created_at: string | null
  updated_at: string | null
}

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ')
}

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '—'
  const units = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function normalizeArray<T>(input: any): T[] {
  if (!input) return []
  if (Array.isArray(input)) return input as T[]
  if (Array.isArray(input?.data)) return input.data as T[]
  if (Array.isArray(input?.items)) return input.items as T[]
  return []
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  window.URL.revokeObjectURL(url)
}

const MAX_BYTES = 5 * 1024 * 1024 // 5 Mo (aligné avec StoreEvisaDocumentRequest)

type PreviewKind = 'image' | 'pdf' | 'other'
function previewKind(doc: EvisaDoc): PreviewKind {
  const mime = (doc.mime_type || '').toLowerCase()
  const name = (doc.original_name || '').toLowerCase()
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/.test(name)) return 'image'
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  return 'other'
}

export default function EvisaDocumentsPanel({ reservationId }: { reservationId: number }) {
  const toast = useToast()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [type, setType] = useState<DocType>('passeport')
  const [label, setLabel] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  // Confirmation de suppression (composant maison, cohérent avec le reste de l'app).
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; doc?: EvisaDoc }>({ open: false })

  // Édition de la note / motif (utile surtout pour justifier un rejet).
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

  // Prévisualisation (image / PDF) via blob authentifié → object URL.
  const [preview, setPreview] = useState<{ doc: EvisaDoc; url: string } | null>(null)
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null)

  const queryKey = ['evisa-documents', reservationId]
  const statutKey = ['evisa-statut', reservationId]

  const q = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get(`/reservations/${reservationId}/evisa-documents`)
      return normalizeArray<EvisaDoc>(data)
    },
    enabled: !!reservationId,
    staleTime: 10_000,
  })

  /* ── Étape consulaire du dossier (cycle de vie visa) ── */
  const qStatut = useQuery({
    queryKey: statutKey,
    queryFn: async () => {
      const { data } = await api.get(`/reservations/${reservationId}/evisa-statut`)
      return (data?.evisa_statut ?? 'constitution') as EvisaStatut
    },
    enabled: !!reservationId,
    staleTime: 10_000,
  })

  const evisaStatut: EvisaStatut = qStatut.data ?? 'constitution'

  const mConsular = useMutation({
    mutationFn: async (evisa_statut: EvisaStatut) => {
      const { data } = await api.patch(`/reservations/${reservationId}/evisa-statut`, { evisa_statut })
      return (data?.evisa_statut ?? evisa_statut) as EvisaStatut
    },
    onSuccess: (next) => {
      qc.setQueryData(statutKey, next)
      qc.invalidateQueries({ queryKey: ['evisa-dossiers'] })
      toast.push({ title: 'Étape du dossier mise à jour ✓', tone: 'success' })
    },
    onError: () => toast.push({ title: "Impossible de mettre à jour l'étape.", tone: 'error' }),
  })

  const docs = q.data ?? []

  /* Avancement de la checklist : pièces attendues présentes / validées. */
  const checklist = useMemo(() => {
    return CHECKLIST.map((t) => {
      const items = docs.filter((d) => d.type === t)
      const valide = items.some((d) => d.statut === 'valide')
      return { type: t, present: items.length > 0, valide, count: items.length }
    })
  }, [docs])

  const validatedCount = checklist.filter((c) => c.valide).length

  /* ── Upload ── */
  const mUpload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      if (label.trim()) fd.append('label', label.trim())
      const { data } = await api.post(`/reservations/${reservationId}/evisa-documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      toast.push({ title: 'Pièce ajoutée ✓', tone: 'success' })
      setLabel('')
      if (fileRef.current) fileRef.current.value = ''
    },
    onError: (err: any) => {
      const v = err?.response?.data?.errors
      const msg = v?.file?.[0] || err?.response?.data?.message || "Échec de l'envoi."
      toast.push({ title: msg, tone: 'error' })
    },
  })

  /* ── Changement de statut ── */
  const mStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: number; statut: DocStatut }) => {
      const { data } = await api.patch(`/evisa-documents/${id}`, { statut })
      return data
    },
    onMutate: ({ id }) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      toast.push({ title: 'Statut mis à jour ✓', tone: 'success' })
    },
    onError: () => toast.push({ title: 'Impossible de mettre à jour le statut.', tone: 'error' }),
  })

  /* ── Suppression ── */
  const mDelete = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/evisa-documents/${id}`) },
    onMutate: (id) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      toast.push({ title: 'Pièce supprimée', tone: 'success' })
    },
    onError: () => toast.push({ title: 'Suppression impossible.', tone: 'error' }),
  })

  /* ── Note / motif (ex : raison d'un rejet) ── */
  const mNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const { data } = await api.patch(`/evisa-documents/${id}`, { notes })
      return data
    },
    onMutate: ({ id }) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      setEditingNotesId(null)
      setNotesDraft('')
      toast.push({ title: 'Note enregistrée ✓', tone: 'success' })
    },
    onError: () => toast.push({ title: "Impossible d'enregistrer la note.", tone: 'error' }),
  })

  const startEditNotes = (doc: EvisaDoc) => { setEditingNotesId(doc.id); setNotesDraft(doc.notes || '') }
  const cancelEditNotes = () => { setEditingNotesId(null); setNotesDraft('') }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_BYTES) {
      toast.push({ title: 'Le fichier ne doit pas dépasser 5 Mo.', tone: 'error' })
      e.target.value = ''
      return
    }
    mUpload.mutate(file)
  }

  const handleDownload = async (doc: EvisaDoc) => {
    setBusyId(doc.id)
    try {
      const res = await api.get(`/evisa-documents/${doc.id}/download`, { responseType: 'blob' })
      downloadBlob(res.data, (doc.original_name || `piece-${doc.id}`).replace(/[^\w\-.]+/g, '_'))
    } catch {
      toast.push({ title: 'Téléchargement impossible.', tone: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  const openPreview = async (doc: EvisaDoc) => {
    setPreviewLoadingId(doc.id)
    try {
      const res = await api.get(`/evisa-documents/${doc.id}/download`, { responseType: 'blob' })
      // On force le bon type MIME pour que le navigateur sache rendre le blob.
      const blob = doc.mime_type ? new Blob([res.data], { type: doc.mime_type }) : res.data
      const url = window.URL.createObjectURL(blob)
      setPreview((prev) => {
        if (prev) window.URL.revokeObjectURL(prev.url) // libère l'aperçu précédent
        return { doc, url }
      })
    } catch {
      toast.push({ title: 'Aperçu impossible.', tone: 'error' })
    } finally {
      setPreviewLoadingId(null)
    }
  }

  const closePreview = () => {
    setPreview((p) => {
      if (p) window.URL.revokeObjectURL(p.url)
      return null
    })
  }

  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft overflow-hidden">
      {/* En-tête */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-black/[0.05] dark:border-white/[0.07] flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-gray-400 dark:text-gray-500"><FolderArchive size={15} /></span>
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">Dossier e-visa</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {/* Étape consulaire — pilotable directement depuis la fiche */}
          <label className="flex items-center gap-1.5" title="Étape consulaire du dossier">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-gray-400 hidden sm:inline">Étape</span>
            <select
              value={evisaStatut}
              disabled={qStatut.isLoading || mConsular.isPending}
              onChange={(e) => mConsular.mutate(e.target.value as EvisaStatut)}
              className={cx(
                'rounded-full border text-xs font-semibold pl-2.5 pr-7 py-1 cursor-pointer disabled:opacity-60',
                EVISA_STATUT_TONE[evisaStatut]
              )}
            >
              {EVISA_STATUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/25 whitespace-nowrap">
            {validatedCount}/{CHECKLIST.length} validées
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Checklist des pièces attendues */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {checklist.map((c) => (
            <div
              key={c.type}
              className={cx(
                'rounded-xl border px-3 py-2.5 text-center',
                c.valide
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10'
                  : c.present
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10'
                  : 'border-black/[0.06] bg-gray-50 dark:border-white/[0.06] dark:bg-white/[0.03]'
              )}
            >
              <div className="flex items-center justify-center mb-1">
                {c.valide
                  ? <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                  : c.present
                  ? <FileText size={16} className="text-amber-600 dark:text-amber-400" />
                  : <AlertCircle size={16} className="text-gray-300 dark:text-gray-600" />}
              </div>
              <div className="text-[12px] font-semibold text-gray-700 dark:text-gray-200 leading-tight">{TYPE_LABELS[c.type]}</div>
              <div className="text-[12px] text-gray-400 mt-0.5">{c.present ? `${c.count} pièce${c.count > 1 ? 's' : ''}` : 'Manquant'}</div>
            </div>
          ))}
        </div>

        {/* Zone d'upload */}
        <div className="rounded-xl border border-dashed border-black/[0.1] dark:border-white/[0.12] p-3 flex flex-col sm:flex-row sm:items-end gap-2.5">
          <label className="flex-1 min-w-0">
            <span className="block text-[12px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Type de pièce</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DocType)}
              className="w-full rounded-lg border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-white/[0.05] px-3 py-2 text-sm text-gray-800 dark:text-gray-100"
            >
              {(Object.keys(TYPE_LABELS) as DocType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <label className="flex-1 min-w-0">
            <span className="block text-[12px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Libellé (optionnel)</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex : Passeport de Awa"
              className="w-full rounded-lg border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-white/[0.05] px-3 py-2 text-sm text-gray-800 dark:text-gray-100"
            />
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={onPickFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={mUpload.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 shrink-0"
          >
            {mUpload.isPending ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            Ajouter
          </button>
        </div>
        <p className="text-[12px] text-gray-400 -mt-3">Formats acceptés : PDF, JPG, PNG — 5 Mo maximum.</p>

        {/* Liste des pièces */}
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-3"><Loader2 size={15} className="animate-spin" /> Chargement…</div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">Aucune pièce déposée pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => {
              const rejected = doc.statut === 'rejete'
              const needsMotif = rejected && !doc.notes && editingNotesId !== doc.id
              return (
              <div
                key={doc.id}
                className="rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                  <span className="shrink-0 text-gray-400"><FileText size={18} /></span>
                  <div className="min-w-0 flex-1 basis-40">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {doc.label || TYPE_LABELS[doc.type] || 'Pièce'}
                      </span>
                      <span className="text-[12px] text-gray-400">{TYPE_LABELS[doc.type]}</span>
                    </div>
                    <div className="text-[12px] text-gray-400 truncate">
                      {doc.original_name || '—'} · {formatBytes(doc.size)}
                    </div>
                  </div>

                  {/* Contrôles : enveloppe qui bascule sous le fichier sur mobile */}
                  <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                    {/* Statut éditable */}
                    <select
                      value={doc.statut}
                      disabled={busyId === doc.id}
                      onChange={(e) => mStatut.mutate({ id: doc.id, statut: e.target.value as DocStatut })}
                      className={cx(
                        'shrink-0 rounded-full border text-xs font-semibold px-2.5 py-1 cursor-pointer',
                        STATUT_TONE[doc.statut]
                      )}
                    >
                      {(Object.keys(STATUT_LABELS) as DocStatut[]).map((s) => (
                        <option key={s} value={s}>{STATUT_LABELS[s]}</option>
                      ))}
                    </select>

                    {/* Note / motif */}
                    <button
                      type="button"
                      onClick={() => (editingNotesId === doc.id ? cancelEditNotes() : startEditNotes(doc))}
                      disabled={busyId === doc.id}
                      title={needsMotif ? 'Ajouter un motif de rejet' : doc.notes ? 'Modifier la note' : 'Ajouter une note'}
                      className={cx(
                        'shrink-0 p-2 rounded-lg disabled:opacity-50 relative',
                        needsMotif
                          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
                          : doc.notes
                          ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                          : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                      )}
                    >
                      <MessageSquare size={15} />
                      {doc.notes && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openPreview(doc)}
                      disabled={previewLoadingId === doc.id}
                      title="Aperçu"
                      className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10 disabled:opacity-50"
                    >
                      {previewLoadingId === doc.id ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      disabled={busyId === doc.id}
                      title="Télécharger"
                      className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 disabled:opacity-50"
                    >
                      {busyId === doc.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete({ open: true, doc })}
                      disabled={busyId === doc.id}
                      title="Supprimer"
                      className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Éditeur de note inline */}
                {editingNotesId === doc.id ? (
                  <div className="px-3 pb-3 pt-0 space-y-2">
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      rows={2}
                      autoFocus
                      placeholder={rejected ? 'Motif du rejet (ex : photo floue, passeport expiré…)' : 'Note interne sur cette pièce…'}
                      className="w-full rounded-lg border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-white/[0.05] px-3 py-2 text-sm text-gray-800 dark:text-gray-100 resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditNotes}
                        className="inline-flex items-center gap-1 rounded-lg border border-black/[0.08] dark:border-white/[0.12] px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                      >
                        <X size={13} /> Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => mNotes.mutate({ id: doc.id, notes: notesDraft.trim() })}
                        disabled={busyId === doc.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                      >
                        {busyId === doc.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Enregistrer
                      </button>
                    </div>
                  </div>
                ) : doc.notes ? (
                  <div className={cx(
                    'px-3 pb-2.5 -mt-0.5 flex items-start gap-1.5 text-[12px]',
                    rejected ? 'text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'
                  )}>
                    <MessageSquare size={12} className="shrink-0 mt-0.5" />
                    <span className="break-words">{doc.notes}</span>
                  </div>
                ) : needsMotif ? (
                  <div className="px-3 pb-2.5 -mt-0.5">
                    <button
                      type="button"
                      onClick={() => startEditNotes(doc)}
                      className="text-[12px] font-semibold text-red-600 dark:text-red-300 hover:underline"
                    >
                      + Préciser le motif du rejet
                    </button>
                  </div>
                ) : null}
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modale d'aperçu */}
      <Modal
        open={!!preview}
        onClose={closePreview}
        title={preview ? (preview.doc.label || TYPE_LABELS[preview.doc.type] || 'Aperçu') : 'Aperçu'}
        widthClass="max-w-4xl"
      >
        {preview && (() => {
          const idx = docs.findIndex((d) => d.id === preview.doc.id)
          const hasPrev = idx > 0
          const hasNext = idx >= 0 && idx < docs.length - 1
          const kind = previewKind(preview.doc)

          const body = kind === 'image' ? (
            <div className="flex justify-center bg-gray-50 dark:bg-black/20 rounded-xl p-2">
              <img src={preview.url} alt={preview.doc.original_name || 'Aperçu'} className="max-h-[68vh] w-auto object-contain rounded-lg" />
            </div>
          ) : kind === 'pdf' ? (
            <iframe src={preview.url} title="Aperçu PDF" className="w-full h-[68vh] rounded-xl border border-black/[0.06] dark:border-white/[0.08]" />
          ) : (
            <div className="text-center py-10 text-sm text-gray-500">
              <FileText size={32} className="mx-auto mb-3 text-gray-300" />
              Aperçu non disponible pour ce format.
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => handleDownload(preview.doc)}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2"
                >
                  <Download size={15} /> Télécharger
                </button>
              </div>
            </div>
          )

          return (
            <div className="space-y-3">
              {/* Barre de navigation entre pièces */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => hasPrev && openPreview(docs[idx - 1])}
                  disabled={!hasPrev || previewLoadingId !== null}
                  className="inline-flex items-center gap-1 rounded-lg border border-black/[0.08] dark:border-white/[0.12] px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} /> Précédent
                </button>

                <div className="text-xs text-gray-400 text-center min-w-0">
                  <span className="font-semibold text-gray-600 dark:text-gray-300">{TYPE_LABELS[preview.doc.type]}</span>
                  {idx >= 0 && <span className="ml-2 tabular-nums">{idx + 1} / {docs.length}</span>}
                </div>

                <button
                  type="button"
                  onClick={() => hasNext && openPreview(docs[idx + 1])}
                  disabled={!hasNext || previewLoadingId !== null}
                  className="inline-flex items-center gap-1 rounded-lg border border-black/[0.08] dark:border-white/[0.12] px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Suivant <ChevronRight size={14} />
                </button>
              </div>

              {body}
            </div>
          )
        })()}
      </Modal>

      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={confirmDelete.open}
        itemName={confirmDelete.doc?.label || (confirmDelete.doc ? TYPE_LABELS[confirmDelete.doc.type] : undefined)}
        message="Le fichier sera définitivement supprimé du dossier."
        onCancel={() => setConfirmDelete({ open: false })}
        onConfirm={() => {
          if (confirmDelete.doc) mDelete.mutate(confirmDelete.doc.id)
          setConfirmDelete({ open: false })
        }}
      />
    </div>
  )
}
