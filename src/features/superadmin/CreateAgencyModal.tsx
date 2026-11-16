// src/features/superadmin/CreateAgencyModal.tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Building2, User, Mail, Phone, MapPin, Hash, Loader2, Copy, CheckCircle2 } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../ui/Toasts'

type Props = {
  open: boolean
  onClose: () => void
}

type CreateResponse = {
  message: string
  agency: { id: number; name: string; slug: string; ref_prefix: string }
  owner: { id: number; email: string; nom: string; prenom: string }
  temp_password: string
}

export function CreateAgencyModal({ open, onClose }: Props) {
  const toast = useToast()
  const qc = useQueryClient()

  // Étape 1 = formulaire, Étape 2 = écran de succès avec credentials
  const [step, setStep] = useState<1 | 2>(1)
  const [result, setResult] = useState<CreateResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    name: '',
    ref_prefix: '',
    plan: 'trial',
    email_contact: '',
    phone: '',
    address: '',
    owner_email: '',
    owner_prenom: '',
    owner_nom: '',
    owner_password: '',
  })

  const createMut = useMutation({
    mutationFn: async (payload: typeof form) => {
      const r = await api.post<CreateResponse>('/super-admin/agencies', payload)
      return r.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['super-admin'] })
      setResult(data)
      setStep(2)
      toast.push({ tone: 'success', title: data.message })
    },
    onError: (e: any) => {
      const errs = e?.response?.data?.errors
      const first = errs ? (Object.values(errs).flat()[0] as string) : null
      toast.push({ tone: 'error', title: first || e?.response?.data?.message || 'Erreur lors de la création' })
    },
  })

  const reset = () => {
    setStep(1)
    setResult(null)
    setCopied(false)
    setForm({
      name: '', ref_prefix: '', plan: 'trial',
      email_contact: '', phone: '', address: '',
      owner_email: '', owner_prenom: '', owner_nom: '', owner_password: '',
    })
    onClose()
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    createMut.mutate(form)
  }

  const copyPassword = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.temp_password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0d1321] rounded-2xl shadow-2xl w-full max-w-2xl my-8">

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-rose-600 text-white flex items-center justify-center">
              <Building2 size={16} />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {step === 1 ? 'Créer une nouvelle agence' : 'Agence créée avec succès'}
            </h2>
          </div>
          <button onClick={reset} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        {/* ─── Étape 1 : formulaire ─── */}
        {step === 1 && (
          <form onSubmit={submit} className="p-6 space-y-5">

            {/* ── Section Agence ── */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1">
                <Building2 size={11} />
                Informations agence
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] text-gray-600 font-medium block mb-1">Nom de l'agence *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Atlantique Voyages"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-gray-600 font-medium block mb-1">
                    <Hash size={9} className="inline" /> Préfixe (3 lettres) *
                  </label>
                  <input
                    type="text"
                    value={form.ref_prefix}
                    onChange={(e) => setForm(f => ({ ...f, ref_prefix: e.target.value.toUpperCase().slice(0, 3) }))}
                    maxLength={3}
                    placeholder="ATV"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-gray-600 font-medium block mb-1">Plan</label>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm(f => ({ ...f, plan: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
                  >
                    <option value="trial">Essai (14 jours)</option>
                    <option value="starter">Starter</option>
                    <option value="standard">Standard</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] text-gray-600 font-medium block mb-1">
                    <Mail size={9} className="inline" /> Email contact agence
                  </label>
                  <input
                    type="email"
                    value={form.email_contact}
                    onChange={(e) => setForm(f => ({ ...f, email_contact: e.target.value }))}
                    placeholder="contact@agence.com"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-gray-600 font-medium block mb-1">
                    <Phone size={9} className="inline" /> Téléphone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+221 77 ..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[12px] text-gray-600 font-medium block mb-1">
                    <MapPin size={9} className="inline" /> Adresse
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Rue, ville, pays"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
                  />
                </div>
              </div>
            </section>

            {/* ── Section Owner ── */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1">
                <User size={11} />
                Propriétaire (owner)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] text-gray-600 font-medium block mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={form.owner_prenom}
                    onChange={(e) => setForm(f => ({ ...f, owner_prenom: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-gray-600 font-medium block mb-1">Nom *</label>
                  <input
                    type="text"
                    value={form.owner_nom}
                    onChange={(e) => setForm(f => ({ ...f, owner_nom: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[12px] text-gray-600 font-medium block mb-1">Email du owner *</label>
                  <input
                    type="email"
                    value={form.owner_email}
                    onChange={(e) => setForm(f => ({ ...f, owner_email: e.target.value }))}
                    placeholder="owner@agence.com"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
                  />
                  <p className="text-[12px] text-gray-400 mt-1">L'email doit être unique dans tout le système.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[12px] text-gray-600 font-medium block mb-1">
                    Mot de passe (laisser vide pour un mot de passe généré aléatoirement)
                  </label>
                  <input
                    type="text"
                    value={form.owner_password}
                    onChange={(e) => setForm(f => ({ ...f, owner_password: e.target.value }))}
                    placeholder="Auto-généré si vide"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm font-mono"
                  />
                </div>
              </div>
            </section>

            {/* ── Actions ── */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={createMut.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
                Créer l'agence
              </button>
            </div>
          </form>
        )}

        {/* ─── Étape 2 : credentials ─── */}
        {step === 2 && result && (
          <div className="p-6 space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>Agence créée avec succès !</strong>
                <p className="mt-1 text-xs">Transmets ces informations au propriétaire. Le mot de passe ne sera pas affiché à nouveau.</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3 font-mono text-sm">
              <CredentialRow label="Agence" value={`${result.agency.name} (${result.agency.ref_prefix})`} />
              <CredentialRow label="Slug" value={result.agency.slug} />
              <CredentialRow label="Email du owner" value={result.owner.email} />
              <CredentialRow label="Nom du owner" value={`${result.owner.prenom} ${result.owner.nom}`} />
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col">
                  <span className="text-[12px] uppercase tracking-wide text-gray-400 font-sans">Mot de passe temporaire</span>
                  <span className="text-base font-bold text-rose-600">{result.temp_password}</span>
                </div>
                <button
                  type="button"
                  onClick={copyPassword}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs font-semibold hover:bg-black"
                >
                  {copied ? <><CheckCircle2 size={12} /> Copié !</> : <><Copy size={12} /> Copier</>}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              ⚠️ Note ce mot de passe — il ne sera plus jamais visible.
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black"
              >
                Terminé
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[12px] uppercase tracking-wide text-gray-400 font-sans">{label}</span>
      <span className="text-gray-900 dark:text-gray-100 font-semibold">{value}</span>
    </div>
  )
}
