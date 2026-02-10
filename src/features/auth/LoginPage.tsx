import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../store/auth'
import logo from '../../assets/brand/logounivtours.jpg'

// ✅ Tes images locales (à mettre dans src/assets/brand/slider/)
import slide1 from '../../assets/brand/slider/slide-5.jpg'
import slide2 from '../../assets/brand/slider/slide-6.jpg'
import slide3 from '../../assets/brand/slider/slide-7.jpg'

type FormVals = {
  email: string
  password: string
}

type Slide = {
  image: string
  title: string
  subtitle: string
}

const slides: Slide[] = [
  {
    image: slide1,
    title: 'Gérez vos réservations facilement',
    subtitle: 'Clients, services, forfaits, paiements et factures — au même endroit.',
  },
  {
    image: slide2,
    title: 'Un suivi clair et professionnel',
    subtitle: 'Historique client, statut des réservations, et actions rapides.',
  },
  {
    image: slide3,
    title: 'Votre agence, plus organisée',
    subtitle: 'Une interface moderne pensée pour gagner du temps au quotidien.',
  },
]

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

  // Slider
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length)
    }, 4500)
    return () => clearInterval(t)
  }, [paused])

  const emailValue = (watch('email') || '').trim()
  const pwdValue = (watch('password') || '').trim()

  const canSubmit = useMemo(() => {
    return isValidEmail(emailValue) && pwdValue.length > 0
  }, [emailValue, pwdValue])

  const onSubmit = async (vals: FormVals) => {
    setError(null)
    const ok = await login(vals.email.trim(), vals.password)
    if (!ok) {
      setError('Identifiants invalides. Vérifiez votre email et votre mot de passe.')
      return
    }
    navigate('/')
  }

  const active = slides[idx]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center px-4 py-10">
      {/* Card */}
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-soft">
        <div className="grid lg:grid-cols-2">
          {/* LEFT: Form */}
          <div className="p-6 sm:p-10">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Universal Tours" className="h-10 w-auto" draggable={false} />
              <div className="leading-tight">
                <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Universal Tours
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Espace de gestion
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Bienvenue 👋
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Connectez-vous pour accéder au tableau de bord.
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <div className="font-semibold">Connexion impossible</div>
                <div className="mt-1">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              {/* Email */}
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  {/* <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none"
                  /> */}
                  <input
                    className="input pl-10"
                    type="email"
                    placeholder="ex: admin@gmail.com"
                    autoComplete="email"
                    {...register('email', {
                      required: 'Email requis',
                      validate: (v) => isValidEmail(v.trim()) || 'Email invalide',
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{String(errors.email.message)}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="label">Mot de passe</label>
                <div className="relative">
                  {/* <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none"
                  /> */}
                  <input
                    className="input pl-10 pr-10"
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 btn px-2 bg-gray-100 dark:bg-white/10"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    title={showPwd ? 'Masquer' : 'Afficher'}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{String(errors.password.message)}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="w-full rounded-xl px-4 py-2.5 font-semibold text-white
                  bg-[var(--ut-orange)] hover:brightness-95 active:brightness-90
                  disabled:opacity-60 disabled:cursor-not-allowed transition
                  inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Connexion…
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>

              <div className="pt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} Universal Tours
              </div>
            </form>
          </div>

          {/* RIGHT: Slider */}
          <div
            className="relative hidden lg:block"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Image */}
            <div className="absolute inset-0">
              <img
                src={active.image}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
              {/* Overlay (pour lisibilité texte) */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/65" />
            </div>

            {/* Content */}
            <div className="relative z-10 h-full p-10 flex flex-col justify-end">
              <div className="max-w-sm">
                <div className="text-white text-2xl font-semibold leading-tight">
                  {active.title}
                </div>
                <div className="mt-2 text-white/80 text-sm leading-relaxed">
                  {active.subtitle}
                </div>
              </div>

              {/* Controls */}
              <div className="mt-6 flex items-center justify-between">
                {/* Dots */}
                <div className="flex items-center gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIdx(i)}
                      className={`h-2.5 rounded-full transition-all ${
                        i === idx ? 'w-7 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/65'
                      }`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Arrows */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn bg-white/15 hover:bg-white/25 text-white px-2"
                    onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
                    aria-label="Précédent"
                    title="Précédent"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className="btn bg-white/15 hover:bg-white/25 text-white px-2"
                    onClick={() => setIdx((i) => (i + 1) % slides.length)}
                    aria-label="Suivant"
                    title="Suivant"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-white/70 transition-all"
                  style={{ width: `${((idx + 1) / slides.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mobile: slider en bas (optionnel) */}
          <div className="lg:hidden border-t border-black/5 dark:border-white/10">
            <div className="relative h-48">
              <img src={active.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/15 to-black/65" />
              <div className="absolute inset-0 p-5 flex flex-col justify-end">
                <div className="text-white font-semibold">{active.title}</div>
                <div className="text-white/80 text-xs mt-1">{active.subtitle}</div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setIdx(i)}
                        className={`h-2 rounded-full transition-all ${
                          i === idx ? 'w-7 bg-white' : 'w-2 bg-white/40'
                        }`}
                        aria-label={`Slide ${i + 1}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn bg-white/15 hover:bg-white/25 text-white px-2"
                      onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      className="btn bg-white/15 hover:bg-white/25 text-white px-2"
                      onClick={() => setIdx((i) => (i + 1) % slides.length)}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
