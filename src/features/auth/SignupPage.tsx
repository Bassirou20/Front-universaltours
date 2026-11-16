// src/features/auth/SignupPage.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  Building2, Mail, User, Lock, Eye, EyeOff, Phone, MapPin,
  Loader2, CheckCircle2, AlertCircle, Sparkles, ArrowRight,
} from 'lucide-react'
import { api } from '../../lib/axios'
import { useAuth } from '../../store/auth'
import { useToast } from '../../ui/Toasts'
import { PasswordStrength } from '../../ui/PasswordStrength'
import logo from '../../assets/brand/itineo-mark.svg'

type SignupForm = {
  agency_name: string
  ref_prefix: string
  phone: string
  address: string
  owner_email: string
  owner_prenom: string
  owner_nom: string
  owner_password: string
  owner_password_confirmation: string
  terms_accepted: boolean
  /** Honeypot anti-bot : doit rester vide (champ masqué, jamais rempli par un humain). */
  website: string
}

// Politique alignée sur le backend (Password::defaults) : 8 caractères min,
// au moins une lettre ET un chiffre.
const passwordMeetsPolicy = (pwd: string): boolean =>
  pwd.length >= 8 && /[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd)

type SignupResponse = {
  message: string
  agency: { id: number; name: string; slug: string; ref_prefix: string }
  user: { id: number; email: string; prenom: string; nom: string; role: string }
  token: string
}

// Debounce générique
function useDebounced<T>(value: T, delay = 400): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

export default function SignupPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { setSession } = useAuth()

  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState<SignupForm>({
    agency_name: '',
    ref_prefix: '',
    phone: '',
    address: '',
    owner_email: '',
    owner_prenom: '',
    owner_nom: '',
    owner_password: '',
    owner_password_confirmation: '',
    terms_accepted: false,
    website: '',
  })

  // ── Auto-génération du préfixe depuis le nom de l'agence ──
  useEffect(() => {
    if (!form.agency_name || form.ref_prefix) return // ne pas écraser si l'user a customisé
    const words = form.agency_name.toUpperCase().split(/[\s\-_]+/).filter(Boolean)
    let prefix = ''
    if (words.length >= 3) prefix = words[0][0] + words[1][0] + words[2][0]
    else if (words.length === 2) prefix = words[0][0] + words[1].slice(0, 2)
    else if (words.length === 1) prefix = words[0].slice(0, 3)
    prefix = prefix.replace(/[^A-Z]/g, '').padEnd(3, 'X').slice(0, 3)
    setForm(f => ({ ...f, ref_prefix: prefix }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.agency_name])

  // ── Vérifs en temps réel (email + prefix dispo) ──
  const debouncedEmail = useDebounced(form.owner_email)
  const debouncedPrefix = useDebounced(form.ref_prefix)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [prefixAvailable, setPrefixAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    if (!debouncedEmail || !/^[^@]+@[^@]+\.[^@]+$/.test(debouncedEmail)) {
      setEmailAvailable(null); return
    }
    let cancelled = false
    api.post('/signup/check-email', { email: debouncedEmail })
      .then(r => { if (!cancelled) setEmailAvailable(r.data.available) })
      .catch(() => { if (!cancelled) setEmailAvailable(null) })
    return () => { cancelled = true }
  }, [debouncedEmail])

  useEffect(() => {
    if (!debouncedPrefix || debouncedPrefix.length !== 3) {
      setPrefixAvailable(null); return
    }
    let cancelled = false
    api.post('/signup/check-prefix', { prefix: debouncedPrefix })
      .then(r => { if (!cancelled) setPrefixAvailable(r.data.available) })
      .catch(() => { if (!cancelled) setPrefixAvailable(null) })
    return () => { cancelled = true }
  }, [debouncedPrefix])

  // ── Mutation signup ──
  const signupMut = useMutation({
    mutationFn: async (payload: SignupForm) => {
      const r = await api.post<SignupResponse>('/signup', payload)
      return r.data
    },
    onSuccess: (data) => {
      // Établit la session dans l'état React (token + user + axios + storage),
      // exactement comme le login. Puis navigation CÔTÉ CLIENT — pas de
      // window.location.href (le reload pouvait faire retomber sur la landing
      // via le catch-all des routes avant que le token soit relu).
      setSession(data.token, data.user as any)
      toast.push({ tone: 'success', title: data.message })
      navigate('/dashboard', { replace: true })
    },
    onError: (e: any) => {
      const errs = e?.response?.data?.errors
      if (errs) {
        const first = Object.values(errs).flat()[0] as string
        toast.push({ tone: 'error', title: first || 'Erreur de validation' })
      } else {
        toast.push({ tone: 'error', title: e?.response?.data?.message || 'Erreur lors de la création' })
      }
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validations finales côté client
    if (form.owner_password !== form.owner_password_confirmation) {
      toast.push({ tone: 'error', title: 'Les mots de passe ne correspondent pas' })
      return
    }
    if (!passwordMeetsPolicy(form.owner_password)) {
      toast.push({ tone: 'error', title: 'Le mot de passe doit faire au moins 8 caractères, avec au moins une lettre et un chiffre' })
      return
    }
    if (!form.terms_accepted) {
      toast.push({ tone: 'error', title: 'Vous devez accepter les CGU' })
      return
    }
    signupMut.mutate(form)
  }

  const isFormValid =
    form.agency_name.length >= 2 &&
    form.ref_prefix.length === 3 &&
    /^[^@]+@[^@]+\.[^@]+$/.test(form.owner_email) &&
    form.owner_prenom.length >= 1 &&
    form.owner_nom.length >= 1 &&
    passwordMeetsPolicy(form.owner_password) &&
    form.owner_password === form.owner_password_confirmation &&
    form.terms_accepted &&
    emailAvailable !== false &&
    prefixAvailable !== false

  return (
    <div className="min-h-screen flex bg-[#fafaf9]">

      {/* ═══════════════════ LEFT : FORM ═══════════════════ */}
      <div className="w-full lg:w-[55%] min-h-screen bg-white lg:border-r border-black/[0.08] flex flex-col justify-center px-6 sm:px-10 py-10">
        <div className="w-full max-w-[480px] mx-auto">

          {/* Brand */}
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <img src={logo} alt="Itinéo" className="h-8 w-auto" />
            <span className="text-base font-bold text-gray-900">Itinéo</span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Créez votre agence</h1>
          <p className="text-sm text-gray-500 mb-6">14 jours d'essai gratuit. Aucune carte bancaire requise.</p>

          <form onSubmit={submit} className="space-y-4">

            {/* ── Honeypot anti-bot ──
                Champ leurre invisible pour les humains (hors écran + aria-hidden
                + tabindex -1 + autocomplete off). Les bots qui remplissent tous
                les champs trahissent ainsi leur nature : le backend rejette la
                requête si `website` est renseigné. Ne pas utiliser display:none
                seul (certains bots l'ignorent) → on le sort du flux visuel. */}
            <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden" tabIndex={-1}>
              <label htmlFor="website">Ne pas remplir ce champ</label>
              <input
                id="website"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
              />
            </div>

            {/* ── Section AGENCE ── */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
                <Building2 size={11} /> Votre agence
              </h2>
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] text-gray-600 font-medium block mb-1">Nom de l'agence *</label>
                  <input
                    type="text"
                    value={form.agency_name}
                    onChange={(e) => setForm(f => ({ ...f, agency_name: e.target.value, ref_prefix: '' }))}
                    placeholder="Atlantique Voyages"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-gray-600 font-medium block mb-1">
                      Préfixe (3 lettres) *
                      <span className="text-gray-400 font-normal ml-1">— auto si vide</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.ref_prefix}
                        onChange={(e) => setForm(f => ({ ...f, ref_prefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) }))}
                        placeholder="ATV"
                        maxLength={3}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono uppercase focus:border-gray-400 focus:outline-none"
                      />
                      {form.ref_prefix.length === 3 && prefixAvailable !== null && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2">
                          {prefixAvailable ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          ) : (
                            <AlertCircle size={14} className="text-rose-500" />
                          )}
                        </span>
                      )}
                    </div>
                    {form.ref_prefix.length === 3 && prefixAvailable === false && (
                      <p className="text-[10px] text-rose-600 mt-0.5">Préfixe déjà utilisé</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 font-medium block mb-1">
                      <Phone size={9} className="inline" /> Téléphone
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+221 77 ..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-gray-600 font-medium block mb-1">
                    <MapPin size={9} className="inline" /> Adresse <span className="text-gray-400">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Plateau, Dakar"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* ── Section COMPTE ── */}
            <div className="pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
                <User size={11} /> Votre compte (propriétaire)
              </h2>
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-gray-600 font-medium block mb-1">Prénom *</label>
                    <input
                      type="text"
                      value={form.owner_prenom}
                      onChange={(e) => setForm(f => ({ ...f, owner_prenom: e.target.value }))}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 font-medium block mb-1">Nom *</label>
                    <input
                      type="text"
                      value={form.owner_nom}
                      onChange={(e) => setForm(f => ({ ...f, owner_nom: e.target.value }))}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-gray-600 font-medium block mb-1">
                    <Mail size={9} className="inline" /> Email professionnel *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={form.owner_email}
                      onChange={(e) => setForm(f => ({ ...f, owner_email: e.target.value }))}
                      placeholder="vous@agence.com"
                      required
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-gray-400 focus:outline-none"
                    />
                    {form.owner_email && emailAvailable !== null && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2">
                        {emailAvailable ? (
                          <CheckCircle2 size={14} className="text-emerald-500" />
                        ) : (
                          <AlertCircle size={14} className="text-rose-500" />
                        )}
                      </span>
                    )}
                  </div>
                  {emailAvailable === false && (
                    <p className="text-[10px] text-rose-600 mt-0.5">Cet email est déjà utilisé</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-gray-600 font-medium block mb-1">
                      <Lock size={9} className="inline" /> Mot de passe *
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={form.owner_password}
                        onChange={(e) => setForm(f => ({ ...f, owner_password: e.target.value }))}
                        placeholder="8 caractères min"
                        minLength={8}
                        required
                        className="w-full px-3 py-2 pr-9 rounded-lg border border-gray-200 text-sm focus:border-gray-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 font-medium block mb-1">Confirmer *</label>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={form.owner_password_confirmation}
                      onChange={(e) => setForm(f => ({ ...f, owner_password_confirmation: e.target.value }))}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-gray-400 focus:outline-none"
                    />
                    {form.owner_password_confirmation && form.owner_password !== form.owner_password_confirmation && (
                      <p className="text-[10px] text-rose-600 mt-0.5">Ne correspond pas</p>
                    )}
                  </div>
                </div>

                {/* ── Indicateur de robustesse ── */}
                <PasswordStrength password={form.owner_password} />
              </div>
            </div>

            {/* ── CGU ── */}
            <label className="flex items-start gap-2 pt-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.terms_accepted}
                onChange={(e) => setForm(f => ({ ...f, terms_accepted: e.target.checked }))}
                className="mt-0.5 rounded border-gray-300"
              />
              <span>
                J'accepte les <a href="/cgu" target="_blank" rel="noopener noreferrer" className="text-[#052468] underline">CGU</a> et la <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="text-[#052468] underline">politique de confidentialité</a>.
              </span>
            </label>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={!isFormValid || signupMut.isPending}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#052468] hover:bg-[#073195] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
            >
              {signupMut.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Création en cours…
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Créer mon agence — 14 jours gratuits
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-500">
              Déjà un compte ? <Link to="/login" className="text-[#052468] font-semibold underline">Se connecter</Link>
            </p>
          </form>
        </div>
      </div>

      {/* ═══════════════════ RIGHT : VALUE PROPS ═══════════════════ */}
      <div className="hidden lg:flex flex-col justify-center w-[45%] px-12 py-10 bg-gradient-to-br from-[#052468] to-[#073195] text-white">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight mb-3">
            La plateforme tout-en-un pour <span className="text-[#F07A1C]">votre agence de voyage</span>
          </h2>
          <p className="text-white/80 text-sm mb-8">
            Gérez clients, réservations, factures et finances depuis une seule interface — pensée pour le marché africain.
          </p>

          <div className="space-y-3">
            {[
              ['Réservations en quelques clics', 'Hôtels, vols, visas, forfaits…'],
              ['Facturation auto en PDF', 'Avec votre logo et vos couleurs'],
              ['Multi-utilisateurs', 'Gérez votre équipe avec des rôles'],
              ['Données isolées', 'Vos infos restent chez vous'],
              ['Support en français', 'Réactif & humain'],
            ].map(([title, desc], i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-[#F07A1C] shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-xs text-white/70">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-white/20">
            <div className="text-[10px] uppercase tracking-wide text-white/60 mb-1">Déjà utilisé par</div>
            <div className="text-sm font-semibold">Sahara Voyages, Atlas Voyages et d'autres agences africaines</div>
          </div>
        </div>
      </div>
    </div>
  )
}
