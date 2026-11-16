// src/features/agency/AgencySettingsPage.tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Upload, Trash2, Save, Palette, Globe2, Phone, Mail,
  MapPin, FileText, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { api } from '../../lib/axios'
import { useAuth } from '../../store/auth'
import { useRole } from '../../hooks/useRole'
import { useToast } from '../../ui/Toasts'
import { ConfirmDialog } from '../../ui/ConfirmDialog'

type Agency = {
  id: number
  name: string
  slug: string
  ref_prefix: string
  email_contact: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  invoice_footer: string | null
  timezone: string
  currency: string
  language: string
  primary_color: string
  plan: string
  status: string
}

const TIMEZONES = [
  'Africa/Dakar',
  'Africa/Abidjan',
  'Africa/Bamako',
  'Africa/Ouagadougou',
  'Africa/Nouakchott',
  'Europe/Paris',
  'Europe/London',
  'America/New_York',
]

const CURRENCIES = [
  { code: 'XOF', label: 'XOF (Franc CFA)' },
  { code: 'EUR', label: 'EUR (Euro)' },
  { code: 'USD', label: 'USD (Dollar US)' },
  { code: 'MAD', label: 'MAD (Dirham Marocain)' },
  { code: 'GBP', label: 'GBP (Livre Sterling)' },
]

const COLOR_PRESETS = [
  '#052468', // Itinéo navy
  '#F07A1C', // Itinéo orange
  '#0EA5A6', // Teal
  '#7C3AED', // Purple
  '#DC2626', // Red
  '#059669', // Emerald
  '#2563EB', // Blue
  '#000000', // Black
]

export default function AgencySettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Restriction d'accès : owner/admin/super_admin seulement ──
  const { isAdmin } = useRole()
  useEffect(() => {
    if (user && !isAdmin) navigate('/dashboard', { replace: true })
  }, [user, isAdmin, navigate])

  // ── Récupère l'agence courante ──
  const { data: agency, isLoading } = useQuery<Agency>({
    queryKey: ['agency', 'me'],
    queryFn: async () => {
      const r = await api.get('/agency/me')
      return r.data
    },
  })

  // ── State du formulaire (initialisé depuis la donnée chargée) ──
  const [form, setForm] = useState<Partial<Agency>>({})
  const [confirmLogoDelete, setConfirmLogoDelete] = useState(false)

  useEffect(() => {
    if (agency) {
      setForm({
        name:           agency.name,
        ref_prefix:     agency.ref_prefix,
        email_contact:  agency.email_contact ?? '',
        phone:          agency.phone ?? '',
        address:        agency.address ?? '',
        invoice_footer: agency.invoice_footer ?? '',
        timezone:       agency.timezone,
        currency:       agency.currency,
        language:       agency.language,
        primary_color:  agency.primary_color,
      })
    }
  }, [agency])

  // ── Mutation : update settings ──
  const updateMut = useMutation({
    mutationFn: async (payload: Partial<Agency>) => {
      const r = await api.patch('/agency/me', payload)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency', 'me'] })
      toast.push({ tone: 'success', title: 'Paramètres enregistrés' })
    },
    onError: (e: any) => {
      const errs = e?.response?.data?.errors
      const msg = errs
        ? (Object.values(errs).flat()[0] as string) || 'Erreur de validation'
        : e?.response?.data?.message || 'Erreur lors de la sauvegarde'
      toast.push({ tone: 'error', title: msg })
    },
  })

  // ── Mutation : upload logo ──
  const uploadLogoMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('logo', file)
      const r = await api.post('/agency/me/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency', 'me'] })
      toast.push({ tone: 'success', title: 'Logo mis à jour' })
    },
    onError: (e: any) => {
      const errs = e?.response?.data?.errors
      const first = errs ? (Object.values(errs).flat()[0] as string) : null
      toast.push({ tone: 'error', title: first || e?.response?.data?.message || 'Erreur lors de l\'upload' })
    },
  })

  // ── Mutation : delete logo ──
  const deleteLogoMut = useMutation({
    mutationFn: async () => {
      const r = await api.delete('/agency/me/logo')
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency', 'me'] })
      toast.push({ tone: 'success', title: 'Logo supprimé' })
    },
    onError: () => toast.push({ tone: 'error', title: 'Erreur lors de la suppression' }),
  })

  if (!user || !isAdmin) return null

  if (isLoading || !agency) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-400 gap-2 text-sm">
        <Loader2 size={16} className="animate-spin" />
        Chargement des paramètres…
      </div>
    )
  }

  const onSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateMut.mutate(form)
  }

  const onLogoSelect = (file: File | null) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.push({ tone: 'error', title: 'Le fichier dépasse 2 Mo' })
      return
    }
    uploadLogoMut.mutate(file)
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* ─── En-tête ─── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Building2 size={22} className="text-[#052468]" />
            Paramètres de l'agence
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Personnalisez l'identité de votre agence : logo, couleurs, infos de contact.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
            <CheckCircle2 size={11} />
            {agency.status}
          </span>
          <span className="px-2 py-1 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-semibold">
            Plan : {agency.plan}
          </span>
        </div>
      </div>

      {/* ─── Section LOGO ─── */}
      <section className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Upload size={16} className="text-[#F07A1C]" />
          Logo de l'agence
        </h2>

        <div className="flex items-center gap-5 flex-wrap">
          {/* Preview du logo actuel */}
          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900">
            {agency.logo_url ? (
              <img src={agency.logo_url} alt="Logo agence" className="w-full h-full object-contain" />
            ) : (
              <div className="text-2xl font-bold text-gray-300">{agency.ref_prefix}</div>
            )}
          </div>

          <div className="flex-1 min-w-[200px]">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => onLogoSelect(e.target.files?.[0] ?? null)}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLogoMut.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#052468] text-white text-sm font-medium hover:bg-[#073195] disabled:opacity-50"
              >
                {uploadLogoMut.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                {agency.logo_url ? 'Changer le logo' : 'Uploader un logo'}
              </button>
              {agency.logo_url && (
                <button
                  type="button"
                  onClick={() => setConfirmLogoDelete(true)}
                  disabled={deleteLogoMut.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 text-sm font-medium hover:bg-rose-100 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
              <AlertCircle size={11} className="mt-0.5 shrink-0" />
              <span>PNG, JPG, WebP ou SVG — max 2 Mo. Préférez un format carré ou rectangulaire avec fond transparent.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section COULEUR ─── */}
      <section className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Palette size={16} className="text-[#F07A1C]" />
          Couleur primaire
        </h2>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Color picker natif */}
          <input
            type="color"
            value={form.primary_color || '#052468'}
            onChange={(e) => setForm(f => ({ ...f, primary_color: e.target.value.toUpperCase() }))}
            className="w-16 h-12 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700"
          />

          {/* Champ hex */}
          <input
            type="text"
            value={form.primary_color || ''}
            onChange={(e) => setForm(f => ({ ...f, primary_color: e.target.value.toUpperCase() }))}
            placeholder="#RRGGBB"
            maxLength={7}
            className="w-32 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm font-mono uppercase"
          />

          {/* Presets */}
          <div className="flex items-center gap-1.5 ml-2">
            {COLOR_PRESETS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(f => ({ ...f, primary_color: c }))}
                className="w-7 h-7 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="mt-4 p-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 mb-2">Aperçu :</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: form.primary_color || '#052468' }}
            >
              Bouton principal
            </button>
            <span
              className="px-2 py-1 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: (form.primary_color || '#052468') + '15',
                color: form.primary_color || '#052468',
              }}
            >
              Badge
            </span>
            <span className="text-sm font-bold" style={{ color: form.primary_color || '#052468' }}>
              Texte mis en valeur
            </span>
          </div>
        </div>
      </section>

      {/* ─── Section INFOS GÉNÉRALES ─── */}
      <form onSubmit={onSave} className="space-y-6">
        <section className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-[#F07A1C]" />
            Identité de l'agence
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium block mb-1">Nom de l'agence</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium block mb-1">
                Préfixe de référence (3 lettres)
                <span className="text-gray-400 ml-1">— ex: UTA, SHV</span>
              </label>
              <input
                type="text"
                value={form.ref_prefix || ''}
                onChange={(e) => setForm(f => ({ ...f, ref_prefix: e.target.value.toUpperCase().slice(0, 3) }))}
                maxLength={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm font-mono uppercase"
                required
              />
            </div>
          </div>
        </section>

        {/* ─── Section CONTACT ─── */}
        <section className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Phone size={16} className="text-[#F07A1C]" />
            Coordonnées
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium block mb-1 flex items-center gap-1">
                <Mail size={11} />
                Email de contact
              </label>
              <input
                type="email"
                value={form.email_contact || ''}
                onChange={(e) => setForm(f => ({ ...f, email_contact: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium block mb-1 flex items-center gap-1">
                <Phone size={11} />
                Téléphone
              </label>
              <input
                type="tel"
                value={form.phone || ''}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium block mb-1 flex items-center gap-1">
                <MapPin size={11} />
                Adresse
              </label>
              <textarea
                value={form.address || ''}
                onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm resize-none"
                placeholder="Rue, ville, pays"
              />
            </div>
          </div>
        </section>

        {/* ─── Section RÉGIONALISATION ─── */}
        <section className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Globe2 size={16} className="text-[#F07A1C]" />
            Régionalisation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium block mb-1">Fuseau horaire</label>
              <select
                value={form.timezone || 'Africa/Dakar'}
                onChange={(e) => setForm(f => ({ ...f, timezone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
              >
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium block mb-1">Devise par défaut</label>
              <select
                value={form.currency || 'XOF'}
                onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
              >
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium block mb-1">Langue</label>
              <select
                value={form.language || 'fr'}
                onChange={(e) => setForm(f => ({ ...f, language: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </section>

        {/* ─── Section FACTURES ─── */}
        <section className="bg-white dark:bg-[#0d1321] border border-black/[0.08] dark:border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-[#F07A1C]" />
            Personnalisation des factures
          </h2>

          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400 font-medium block mb-1">
              Pied de page (mentions légales, RCS, etc.)
            </label>
            <textarea
              value={form.invoice_footer || ''}
              onChange={(e) => setForm(f => ({ ...f, invoice_footer: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm resize-y"
              placeholder="Ex : RCS Dakar SN-2024-XXXX • NINEA 1234567 • Membre IATA #X1234"
            />
            <p className="text-xs text-gray-500 mt-1">Ce texte apparaîtra en bas de chaque facture PDF générée.</p>
          </div>
        </section>

        {/* ─── Boutons d'action ─── */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="submit"
            disabled={updateMut.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium text-sm transition-all hover:-translate-y-px"
            style={{ backgroundColor: form.primary_color || '#052468' }}
          >
            {updateMut.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Enregistrer les modifications
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmLogoDelete}
        title="Supprimer le logo actuel ?"
        message="Le logo par défaut sera utilisé à la place."
        onCancel={() => setConfirmLogoDelete(false)}
        onConfirm={() => {
          setConfirmLogoDelete(false)
          deleteLogoMut.mutate()
        }}
      />
    </div>
  )
}
