import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ChevronRight, Mail, Lock } from 'lucide-react'
import { useAuth } from '../../store/auth'
import { api } from '../../lib/axios'

type FormVals = {
  email: string
  password: string
}

const isValidEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email)

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormVals>({
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  })

  const [error, setError] = useState<string | null>(null)
  const [showPwd, setShowPwd] = useState(false)

  const emailValue = (watch('email') || '').trim()
  const pwdValue = (watch('password') || '').trim()
  const canSubmit = useMemo(
    () => isValidEmail(emailValue) && pwdValue.length > 0,
    [emailValue, pwdValue]
  )

  const onSubmit = async (vals: FormVals) => {
    setError(null)
    const ok = await login(vals.email.trim(), vals.password)
    if (!ok) {
      setError('Identifiants invalides. Vérifiez votre email et votre mot de passe.')
      return
    }
    // Si le user a un mdp temporaire, on le redirige vers /profile
    try {
      const { data: me } = await api.get('/me')
      if (me?.must_change_password) {
        navigate('/profile?force_pwd=1', { replace: true })
        return
      }
    } catch { /* ignore */ }
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex bg-[#fafaf9]">

      {/* ═══════════════════ LEFT : FORM ═══════════════════ */}
      <div className="w-full lg:w-[42%] min-h-screen bg-white lg:border-r border-black/[0.08] flex flex-col justify-center px-6 sm:px-10 py-10">
        <div className="w-full max-w-[360px] mx-auto">

          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-[34px] h-[34px] rounded-[9px] bg-gradient-to-br from-[#F07A1C] to-[#c84a14] text-white font-bold text-[13px] flex items-center justify-center">
              UT
            </div>
            <div className="leading-tight">
              <div className="text-[14px] font-bold text-[#1a1916]">Universal Tours</div>
              <div className="text-[10.5px] text-[#9e9d99] mt-px">Agence de voyage</div>
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F07A1C]/10 text-[#F07A1C] text-[10.5px] font-semibold mb-3.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F07A1C]" />
            Plateforme v1.0
          </div>

          {/* Title */}
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] leading-[1.15] mb-2 text-[#1a1916]">
            Bon retour parmi nous.
          </h1>
          <p className="text-[13px] text-[#555450] leading-relaxed mb-7">
            Connectez-vous pour accéder à votre tableau de bord et gérer vos opérations.
          </p>

          {/* Bandeau erreur */}
          {error && (
            <div className="mb-4 rounded-[10px] border border-red-200 bg-red-50 p-3 text-[12.5px] text-red-800">
              <div className="font-semibold">Connexion impossible</div>
              <div className="mt-0.5 text-[12px]">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">

            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold text-[#555450] mb-1.5">Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9e9d99] pointer-events-none" />
                <input
                  className="w-full pl-[34px] pr-3 py-2.5 border border-black/[0.14] rounded-lg bg-white text-[13px] text-[#1a1916] placeholder:text-[#9e9d99] outline-none transition focus:border-[#1a1916] focus:ring-[3px] focus:ring-black/[0.08]"
                  type="email"
                  placeholder="prenom@universal-tours.com"
                  autoComplete="email"
                  {...register('email', {
                    required: 'Email requis',
                    validate: (v) => isValidEmail(v.trim()) || 'Email invalide',
                  })}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-[10.5px] text-red-600">{String(errors.email.message)}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-[11px] font-semibold text-[#555450] mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9e9d99] pointer-events-none" />
                <input
                  className="w-full pl-[34px] pr-10 py-2.5 border border-black/[0.14] rounded-lg bg-white text-[13px] text-[#1a1916] placeholder:text-[#9e9d99] outline-none transition focus:border-[#1a1916] focus:ring-[3px] focus:ring-black/[0.08]"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', {
                    required: 'Mot de passe requis',
                    minLength: { value: 4, message: 'Mot de passe trop court' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[#9e9d99] hover:text-[#1a1916] hover:bg-black/[0.04] transition"
                  aria-label={showPwd ? 'Masquer' : 'Afficher'}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-[10.5px] text-red-600">{String(errors.password.message)}</p>
              )}
            </div>

            {/* Row: souvenir + oublié */}
            <div className="flex items-center justify-between text-[11.5px] pt-0.5 pb-2">
              <label className="inline-flex items-center gap-1.5 text-[#555450] cursor-pointer select-none">
                <input type="checkbox" defaultChecked className="w-[13px] h-[13px] accent-[#1a1916]" />
                Se souvenir
              </label>
              <Link to="/forgot-password" className="text-[#555450] hover:text-[#1a1916] font-medium">
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Bouton */}
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-[#1a1916] text-white font-semibold text-[13px] transition hover:bg-[#333] hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Connexion…
                </>
              ) : (
                <>
                  Accéder au dashboard
                  <ChevronRight size={13} />
                </>
              )}
            </button>

            <div className="text-center text-[10.5px] text-[#9e9d99] pt-4 inline-flex w-full items-center justify-center gap-1">
              <span>© {new Date().getFullYear()} Universal Tours</span>
              <span>·</span>
              <span>Connexion sécurisée</span>
              <Lock size={9} className="text-[#9e9d99]" />
            </div>
          </form>
        </div>
      </div>

      {/* ═══════════════════ RIGHT : DASHBOARD PREVIEW ═══════════════════ */}
      <div
        className="hidden lg:flex w-[58%] min-h-screen flex-col justify-center px-10 py-10 relative overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse 1000px 500px at top right, rgba(240,122,28,0.05), transparent 50%), radial-gradient(ellipse 1000px 500px at bottom left, rgba(5,36,104,0.05), transparent 50%), #fafaf9',
        }}
      >
        {/* Eyebrow + title */}
        <div className="text-[10.5px] text-[#F07A1C] font-bold uppercase tracking-[0.15em] mb-2.5">
          Aperçu
        </div>
        <h2 className="text-[28px] font-light tracking-[-0.02em] leading-[1.15] mb-2 max-w-[460px] text-[#1a1916]">
          Votre <strong className="font-semibold">tableau de bord</strong> en temps réel.
        </h2>
        <p className="text-[13px] text-[#555450] leading-relaxed mb-7 max-w-[460px]">
          Réservations, factures, paiements et clients. Tout est centralisé pour vous faire gagner du temps au quotidien.
        </p>

        {/* Dashboard mockup */}
        <div className="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden max-w-[580px]"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.03), 0 30px 80px rgba(0,0,0,0.10)' }}
        >
          {/* Window bar */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#f5f5f4] border-b border-black/[0.08]">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
              <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
              <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
            </div>
            <div className="flex-1 bg-white border border-black/[0.08] rounded-md px-2.5 py-0.5 text-center font-mono text-[10px] text-[#9e9d99] mx-2">
              app.universal-tours.com/dashboard
            </div>
          </div>

          {/* Body : mini sidebar + content */}
          <div className="grid grid-cols-[60px_1fr] min-h-[320px]">
            {/* Mini sidebar */}
            <div className="bg-[#fafafa] border-r border-black/[0.08] py-3 px-1.5 flex flex-col items-center gap-1.5">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#F07A1C] to-[#c84a14] text-white font-bold text-[10px] flex items-center justify-center mb-2">
                UT
              </div>
              {/* Active item */}
              <div className="w-[30px] h-[30px] rounded-[7px] bg-[#1a1916] text-white flex items-center justify-center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              </div>
              {/* Others */}
              {[
                <svg key="r" width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"><path d="M21 7.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5"/><path d="m3 7.5 9 5 9-5"/></svg>,
                <svg key="f" width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
                <svg key="p" width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
                <svg key="c" width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
              ].map((icon, i) => (
                <div key={i} className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center text-[#9e9d99]">
                  {icon}
                </div>
              ))}
            </div>

            {/* Content area */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-bold">Dashboard</div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#f5f5f4] rounded-md text-[10px] text-[#9e9d99]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  Rechercher
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <KpiMock label="Réservations" value="128" trend="↑ +12" />
                <KpiMock label="CA encaissé" value="12.4M" trend="↑ +8.5%" />
                <KpiMock label="Clients" value="86" trend="↑ +5" />
              </div>

              {/* Mini table */}
              <div className="border border-black/[0.08] rounded-lg overflow-hidden bg-white">
                <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] gap-1.5 px-2.5 py-1.5 bg-[#fafafa] border-b border-black/[0.08] text-[9px] text-[#9e9d99] uppercase tracking-[0.07em] font-semibold">
                  <span>Client</span>
                  <span>Réf.</span>
                  <span>Montant</span>
                  <span>Statut</span>
                </div>
                <TableRow avatar="AD" color="bg-sky-500" name="Amadou Diallo" reference="UT-AV-260516" amount="450 000" tone="ok" status="Payée" delay={700} />
                <TableRow avatar="FN" color="bg-emerald-500" name="Fatou Ndiaye" reference="UT-HOT-26051" amount="120 000" tone="warn" status="À suivre" delay={900} />
                <TableRow avatar="MS" color="bg-amber-500" name="Moussa Sarr" reference="UT-EVS-26051" amount="85 000" tone="info" status="Émise" delay={1100} />
              </div>
            </div>
          </div>
        </div>

        {/* Floating toasts */}
        <FloatingToast
          className="absolute top-[8%] right-[3%]"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
          }
          tone="emerald"
          title="Paiement reçu"
          sub="450 000 XOF · Amadou D."
          delay={1300}
        />
        <FloatingToast
          className="absolute bottom-[12%] right-[5%]"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"><path d="M21 7.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5"/><path d="m3 7.5 9 5 9-5"/></svg>
          }
          tone="sky"
          title="Nouvelle réservation"
          sub="DKR → CDG · 3 pax"
          delay={1600}
        />
      </div>

      {/* Animations */}
      <style>{`
        @keyframes countUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInRow { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes floatIn { from { opacity: 0; transform: translateY(10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  )
}

// ─── KPI mock card ──────────────────────────────────────────────────────────
function KpiMock({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="bg-[#fcfcfc] border border-black/[0.08] rounded-lg p-2.5">
      <div className="text-[9px] text-[#9e9d99] uppercase tracking-[0.07em] font-semibold">{label}</div>
      <div className="text-[16px] font-light tracking-[-0.02em] mt-1 font-mono" style={{ animation: 'countUp 1.5s ease-out 0.5s both' }}>
        {value}
      </div>
      <div className="text-[9px] text-emerald-600 mt-0.5 font-semibold">{trend}</div>
    </div>
  )
}

// ─── Table row mock ─────────────────────────────────────────────────────────
function TableRow({
  avatar, color, name, reference, amount, tone, status, delay,
}: {
  avatar: string
  color: string
  name: string
  reference: string
  amount: string
  tone: 'ok' | 'warn' | 'info'
  status: string
  delay: number
}) {
  const pillCls = {
    ok:   'bg-emerald-500/15 text-emerald-600',
    warn: 'bg-amber-500/20 text-amber-600',
    info: 'bg-sky-500/15 text-sky-600',
  }[tone]
  return (
    <div
      className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] gap-1.5 px-2.5 py-1.5 border-b border-black/[0.08] last:border-b-0 text-[10.5px] items-center"
      style={{ animation: `fadeInRow 0.4s ease-out ${delay}ms both` }}
    >
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span className={`w-5 h-5 rounded-full ${color} text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0`}>
          {avatar}
        </span>
        <span className="truncate">{name}</span>
      </span>
      <span className="font-mono text-[9.5px] text-[#9e9d99] truncate">{reference}</span>
      <span className="font-mono text-[10px] font-semibold">{amount}</span>
      <span><span className={`inline-block px-1.5 py-px rounded-full text-[9px] font-semibold ${pillCls}`}>{status}</span></span>
    </div>
  )
}

// ─── Floating toast ─────────────────────────────────────────────────────────
function FloatingToast({
  className, icon, tone, title, sub, delay,
}: {
  className: string
  icon: React.ReactNode
  tone: 'emerald' | 'sky'
  title: string
  sub: string
  delay: number
}) {
  const toneCls = tone === 'emerald'
    ? 'bg-emerald-100 text-emerald-600'
    : 'bg-sky-100 text-sky-600'
  return (
    <div
      className={`${className} bg-white border border-black/[0.08] rounded-[10px] px-3 py-2.5 flex items-center gap-2.5`}
      style={{
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        animation: `floatIn 0.6s ease-out ${delay}ms both`,
      }}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${toneCls}`}>
        {icon}
      </div>
      <div className="leading-tight">
        <div className="text-[11px] font-semibold text-[#1a1916]">{title}</div>
        <div className="text-[9.5px] text-[#9e9d99] mt-px">{sub}</div>
      </div>
    </div>
  )
}
