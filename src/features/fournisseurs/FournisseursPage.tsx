import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../../lib/axios'
import { useDebouncedValue, normalizePaged } from '../../lib/helpers'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { FiltersBar } from '../../ui/FiltersBar'
import { Pagination } from '../../ui/Pagination'
import { T, Th, Td } from '../../ui/Table'
import { useToast } from '../../ui/Toasts'
import { ActionsMenu } from '../../ui/ActionsMenu'
import {
  Truck, Search, Plus, Eye, Pencil, Trash2,
  Mail, Phone, Globe, Package, Loader2,
} from 'lucide-react'

// ---------- types ----------
type Fournisseur = {
  id: number
  nom: string
  email: string
  telephone?: string | null
  site_web?: string | null
  description?: string | null
  created_at?: string | null
}

// ---------- helpers ----------
function initials(nom: string) {
  return nom.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'FN'
}

function safeDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString()
}

// ---------- schéma formulaire ----------
const schema = z.object({
  nom:         z.string().min(1, 'Nom requis').max(255),
  email:       z.string().email('Email invalide'),
  telephone:   z.string().max(20).optional().or(z.literal('')),
  site_web:    z.string().max(255).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
})
type FormValues = z.infer<typeof schema>

// ---------- Formulaire ----------
function FournisseurForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitting,
}: {
  defaultValues?: Partial<FormValues>
  onSubmit: (v: FormValues) => void
  onCancel: () => void
  submitting: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: '', email: '', telephone: '', site_web: '', description: '',
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Nom <span className="text-red-500">*</span></label>
          <input className="input" placeholder="Ex: Air Sénégal" {...register('nom')} />
          {errors.nom && <p className="mt-1 text-xs text-red-500">{errors.nom.message}</p>}
        </div>
        <div>
          <label className="label">Email <span className="text-red-500">*</span></label>
          <input className="input" type="email" placeholder="contact@fournisseur.com" {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input className="input" placeholder="+221 77 000 00 00" {...register('telephone')} />
        </div>
        <div>
          <label className="label">Site web</label>
          <input className="input" placeholder="https://exemple.com" {...register('site_web')} />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input min-h-[80px] resize-y" placeholder="Description du fournisseur…" {...register('description')} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn bg-gray-200 dark:bg-white/10" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={submitting}>
          {submitting && <Loader2 size={15} className="animate-spin" />}
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}

// ---------- Page principale ----------
export default function FournisseursPage() {
  const qc    = useQueryClient()
  const toast = useToast()

  const [page, setPage]               = useState(1)
  const [search, setSearch]           = useState('')
  const debouncedSearch               = useDebouncedValue(search, 300)

  const [openCreate, setOpenCreate]   = useState(false)
  const [editing, setEditing]         = useState<Fournisseur | null>(null)
  const [viewing, setViewing]         = useState<Fournisseur | null>(null)
  const [deleteId, setDeleteId]       = useState<number | null>(null)

  // ---------- Liste ----------
  const qList = useQuery({
    queryKey: ['fournisseurs', { page, search: debouncedSearch }],
    queryFn: async () => {
      const { data } = await api.get('/fournisseurs', {
        params: { page, per_page: 10, search: debouncedSearch || undefined },
      })
      return data
    },
    placeholderData: keepPreviousData,
  })

  const paged        = normalizePaged(qList.data)
  const rows         = paged.items as Fournisseur[]

  // ---------- Mutations ----------
  const mCreate = useMutation({
    mutationFn: (vals: FormValues) => api.post('/fournisseurs', vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fournisseurs'] })
      setOpenCreate(false)
      toast.push({ title: 'Fournisseur créé', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur création', tone: 'error' }),
  })

  const mUpdate = useMutation({
    mutationFn: ({ id, vals }: { id: number; vals: FormValues }) =>
      api.put(`/fournisseurs/${id}`, vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fournisseurs'] })
      setEditing(null)
      toast.push({ title: 'Fournisseur mis à jour', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur mise à jour', tone: 'error' }),
  })

  const mDelete = useMutation({
    mutationFn: (id: number) => api.delete(`/fournisseurs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fournisseurs'] })
      toast.push({ title: 'Fournisseur supprimé', tone: 'success' })
    },
    onError: (e: any) => toast.push({ title: e?.response?.data?.message || 'Erreur suppression', tone: 'error' }),
  })

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
            <Truck size={16} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">Fournisseurs</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
              {paged.total} fournisseur{paged.total > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition shadow-sm shrink-0"
          onClick={() => setOpenCreate(true)}
        >
          <Plus size={15} /> Nouveau fournisseur
        </button>
      </div>

      {/* Filtres */}
      <FiltersBar>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="flex-1">
            <label className="label">Recherche</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                className="input !pl-9"
                placeholder="Nom, email, téléphone…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              className="btn bg-gray-200 dark:bg-white/10"
              onClick={() => { setSearch(''); setPage(1) }}
            >
              Effacer
            </button>
          </div>
        </div>
      </FiltersBar>

      {/* Liste */}
      <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-white dark:bg-[#151d2e] shadow-sm overflow-hidden">
        {/* List header */}
        <div className="hidden sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_72px] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_100px_72px] items-center gap-3 px-4 py-2 border-b border-black/[0.04] dark:border-white/[0.05] bg-gray-50/80 dark:bg-white/[0.02]">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">Fournisseur</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Contact</span>
          <span className="hidden md:inline text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Site web</span>
          <span className="hidden md:inline text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Ajouté</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-center">Actions</span>
        </div>

        {qList.isLoading ? (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="h-7 w-7 rounded-full bg-black/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 h-3 rounded bg-black/[0.06] animate-pulse" />
                <div className="h-3 w-32 rounded bg-black/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
        ) : qList.isError ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-5">
            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-3">
              <Truck size={20} className="text-red-400" />
            </div>
            <div className="text-sm font-semibold text-gray-500">Impossible de charger les fournisseurs</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
              <Truck size={22} className="text-gray-300 dark:text-gray-600" />
            </div>
            <div className="text-base font-semibold text-gray-500 dark:text-gray-400">Aucun fournisseur trouvé</div>
            <button
              onClick={() => setOpenCreate(true)}
              className="mt-4 inline-flex whitespace-nowrap items-center gap-2 rounded-lg bg-[var(--ut-orange)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95 transition"
            >
              <Plus size={15} /> Nouveau fournisseur
            </button>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {rows.map(f => {
              const actions = [
                { label: 'Voir', icon: <Eye size={15} />, onClick: () => setViewing(f) },
                { label: 'Modifier', icon: <Pencil size={15} />, onClick: () => setEditing(f) },
                { label: 'Supprimer', icon: <Trash2 size={15} />, tone: 'danger' as const, onClick: () => setDeleteId(f.id), disabled: mDelete.isPending },
              ]

              return (
                <div
                  key={f.id}
                  onClick={() => setViewing(f)}
                  className="group flex flex-col sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_72px] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_100px_72px] sm:items-center gap-1 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-2 hover:bg-gray-50/80 dark:hover:bg-white/[0.025] transition-colors cursor-pointer"
                >
                  {/* Cell 1 : Avatar + nom */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 flex items-center justify-center text-[10px] font-bold">
                      {initials(f.nom)}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0" title={f.nom}>{f.nom}</span>
                    {/* Actions mobile */}
                    <div onClick={e => e.stopPropagation()} className="flex sm:hidden shrink-0 -mr-1">
                      <ActionsMenu items={actions} />
                    </div>
                  </div>

                  {/* Cell 2 : Contact (sm+) */}
                  <div className="hidden sm:flex items-center justify-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 min-w-0">
                    <Mail size={12} className="text-gray-400 shrink-0" />
                    <span className="truncate" title={f.email}>{f.email}</span>
                  </div>

                  {/* Cell 3 : Site web (md+) */}
                  <div className="hidden md:flex items-center justify-center min-w-0">
                    {f.site_web ? (
                      <a
                        href={f.site_web.startsWith('http') ? f.site_web : `https://${f.site_web}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 hover:underline truncate"
                        onClick={e => e.stopPropagation()}
                      >
                        <Globe size={12} className="shrink-0" />
                        <span className="truncate">{f.site_web.replace(/^https?:\/\//, '')}</span>
                      </a>
                    ) : <span className="text-sm text-gray-400">—</span>}
                  </div>

                  {/* Cell 4 : Date (md+) */}
                  <div className="hidden md:flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                    {safeDate(f.created_at)}
                  </div>

                  {/* Mobile summary */}
                  <div className="flex sm:hidden flex-wrap items-center gap-x-3 gap-y-0.5 pl-9 text-xs text-gray-500 dark:text-gray-400">
                    {f.email && <span className="inline-flex items-center gap-1 min-w-0"><Mail size={11} /><span className="truncate max-w-[180px]">{f.email}</span></span>}
                    {f.telephone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {f.telephone}</span>}
                  </div>

                  {/* Cell 5 : Actions (sm+) */}
                  <div onClick={e => e.stopPropagation()} className="hidden sm:flex justify-center">
                    <ActionsMenu items={actions} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Pagination page={paged.page} lastPage={paged.lastPage} total={paged.total} onPage={setPage} />

      {/* Modal — Créer */}
      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Nouveau fournisseur" widthClass="max-w-2xl">
        <FournisseurForm
          onSubmit={vals => mCreate.mutate(vals)}
          onCancel={() => setOpenCreate(false)}
          submitting={mCreate.isPending}
        />
      </Modal>

      {/* Modal — Modifier */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifier le fournisseur" widthClass="max-w-2xl">
        {editing && (
          <FournisseurForm
            defaultValues={{
                nom: editing.nom,
                email: editing.email,
                telephone: editing.telephone ?? undefined,
                site_web: editing.site_web ?? undefined,
                description: editing.description ?? undefined,
              }}
            onSubmit={vals => mUpdate.mutate({ id: editing.id, vals })}
            onCancel={() => setEditing(null)}
            submitting={mUpdate.isPending}
          />
        )}
      </Modal>

      {/* Modal — Détails */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Détails du fournisseur" widthClass="max-w-xl">
        {viewing && (
          <div className="space-y-3">
            {/* En-tête */}
            <div className="flex items-center gap-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] p-4">
              <div className="h-14 w-14 shrink-0 rounded-2xl bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 flex items-center justify-center text-lg font-bold">
                {initials(viewing.nom)}
              </div>
              <div>
                <p className="text-lg font-semibold">{viewing.nom}</p>
                <p className="text-sm text-gray-500">Fournisseur #{viewing.id}</p>
              </div>
            </div>

            {/* Infos */}
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4 space-y-3">
              <Row icon={<Mail size={15} />} label="Email" value={viewing.email} />
              <Row icon={<Phone size={15} />} label="Téléphone" value={viewing.telephone} />
              <Row
                icon={<Globe size={15} />}
                label="Site web"
                value={
                  viewing.site_web ? (
                    <a
                      href={viewing.site_web.startsWith('http') ? viewing.site_web : `https://${viewing.site_web}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      {viewing.site_web}
                    </a>
                  ) : null
                }
              />
              <Row icon={<Package size={15} />} label="Ajouté le" value={safeDate(viewing.created_at)} />
            </div>

            {viewing.description && (
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{viewing.description}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button className="btn bg-gray-200 dark:bg-white/10" onClick={() => setViewing(null)}>Fermer</button>
              <button className="btn-primary" onClick={() => { setEditing(viewing); setViewing(null) }}>
                <Pencil size={14} className="mr-2" /> Modifier
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation suppression */}
      <ConfirmDialog
        open={deleteId !== null}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId != null) mDelete.mutate(deleteId)
          setDeleteId(null)
        }}
        title="Supprimer ce fournisseur ?"
        message="Cette action est irréversible. Le fournisseur sera définitivement supprimé."
      />
    </div>
  )
}

// Composant utilitaire pour les lignes de détails
function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 text-gray-400 shrink-0">{icon}</span>
      <span className="w-24 shrink-0 text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 dark:text-white break-all">
        {value || <span className="text-gray-400">—</span>}
      </span>
    </div>
  )
}
